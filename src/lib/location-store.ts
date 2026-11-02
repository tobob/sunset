import Storage from 'expo-sqlite/kv-store';

export type StoredLocation = {
  latitude: number;
  longitude: number;
  name: string | null;
  updatedAt: number;
};

const KEY = 'sunset.lastLocation';

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: { value: StoredLocation | null } | undefined;

/** Subscribe to location changes (compatible with `useSyncExternalStore`). */
export function subscribeLocation(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLastLocation(): StoredLocation | null {
  if (!cache) cache = { value: readStored() };
  return cache.value;
}

function readStored(): StoredLocation | null {
  try {
    const raw = Storage.getItemSync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredLocation>;
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') return null;
    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      name: typeof parsed.name === 'string' ? parsed.name : null,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function saveLocation(l: StoredLocation): void {
  cache = { value: l };
  listeners.forEach((listener) => listener());
  try {
    Storage.setItemSync(KEY, JSON.stringify(l));
  } catch {
    // Persisting is best-effort; the in-memory location is still used.
  }
}
