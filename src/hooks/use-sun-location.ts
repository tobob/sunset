import * as Location from 'expo-location';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import {
  getLastLocation,
  saveLocation,
  subscribeLocation,
  type StoredLocation,
} from '@/lib/location-store';
import { updateSunWidget } from '@/widgets/update-sun-widget';

export type SunLocationStatus = 'loading' | 'ready' | 'denied' | 'error';

const POSITION_TIMEOUT_MS = 15_000;
const GEOCODE_TIMEOUT_MS = 5_000;
/** A last-known fix younger than this is good enough to skip a fresh GPS request. */
const LAST_KNOWN_MAX_AGE_MS = 10 * 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function pushToWidget(l: StoredLocation) {
  try {
    updateSunWidget({ latitude: l.latitude, longitude: l.longitude, name: l.name });
  } catch {
    // Widget update is best-effort.
  }
}

async function placeName(latitude: number, longitude: number): Promise<string | null> {
  try {
    const [address] = await withTimeout(
      Location.reverseGeocodeAsync({ latitude, longitude }),
      GEOCODE_TIMEOUT_MS,
    );
    if (!address) return null;
    return (
      address.city ??
      address.district ??
      address.subregion ??
      address.region ??
      address.country ??
      null
    );
  } catch {
    // Offline or geocoder unavailable.
    return null;
  }
}

/** Roughly 1 km — reuse the cached place name when we haven't moved further than this. */
function isNear(a: StoredLocation, lat: number, lon: number) {
  return Math.abs(a.latitude - lat) < 0.01 && Math.abs(a.longitude - lon) < 0.01;
}

let inFlight: Promise<SunLocationStatus> | null = null;

async function fetchLocation(): Promise<SunLocationStatus> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return 'denied';

  let position = await Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
  }).catch(() => null);
  if (!position) {
    try {
      position = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        POSITION_TIMEOUT_MS,
      );
    } catch {
      // Fall back to any last known fix, however old.
      position = await Location.getLastKnownPositionAsync().catch(() => null);
    }
  }
  const prev = getLastLocation();
  if (!position) return prev ? 'ready' : 'error';

  const { latitude, longitude } = position.coords;
  const name =
    (await placeName(latitude, longitude)) ??
    (prev && isNear(prev, latitude, longitude) ? prev.name : null);

  const next: StoredLocation = { latitude, longitude, name, updatedAt: Date.now() };
  saveLocation(next);
  pushToWidget(next);
  return 'ready';
}

/** Deduplicates concurrent refreshes across all hook instances. */
function refreshShared(): Promise<SunLocationStatus> {
  inFlight ??= fetchLocation()
    .catch((): SunLocationStatus => (getLastLocation() ? 'ready' : 'error'))
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * Returns the cached location immediately, then (unless `autoRefresh` is false)
 * refreshes it from the device: permission → last known / current position →
 * reverse geocode (optional, tolerated offline) → persisted + pushed to widget.
 */
export function useSunLocation({ autoRefresh = true }: { autoRefresh?: boolean } = {}) {
  const location = useSyncExternalStore(subscribeLocation, getLastLocation);
  const [status, setStatus] = useState<SunLocationStatus>(
    autoRefresh ? 'loading' : location ? 'ready' : 'loading',
  );

  const refresh = useCallback(async () => {
    setStatus('loading');
    setStatus(await refreshShared());
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    // Push cached data to the widget right away so it's populated even offline.
    let active = true;
    const cached = getLastLocation();
    if (cached) pushToWidget(cached);
    void refreshShared().then((next) => {
      if (active) setStatus(next);
    });
    return () => {
      active = false;
    };
  }, [autoRefresh]);

  return { location, status, refresh };
}
