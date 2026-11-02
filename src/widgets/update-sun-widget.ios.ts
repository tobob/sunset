import { formatDuration, formatTime } from "@/lib/format";
import { getSunTimes } from "@/lib/sun";

import SunWidget, { type SunWidgetProps } from "./SunWidget";

export type SunWidgetLocation = {
  latitude: number;
  longitude: number;
  name: string | null;
};

/** How many days of timeline to schedule, so the widget stays correct without the app opening. */
const DAYS_AHEAD = 7;

function formatCoords(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? "E" : "W"}`;
  return `${lat} ${lon}`;
}

function formatDateLabel(d: Date): string {
  try {
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d.toDateString();
  }
}

function propsForDay(
  day: Date,
  loc: SunWidgetLocation,
  place: string,
): SunWidgetProps {
  const t = getSunTimes(day, loc.latitude, loc.longitude);
  const dayLength =
    t.polar === "day"
      ? "Polar day"
      : t.polar === "night"
        ? "Polar night"
        : formatDuration(t.dayLengthMinutes);
  return {
    sunrise: formatTime(t.sunrise),
    sunset: formatTime(t.sunset),
    dayLength,
    place,
    dateLabel: formatDateLabel(day),
    hasData: true,
  };
}

/**
 * Pushes today's and the next week's sunrise/sunset to the iOS widget as a timeline with one entry
 * per local midnight (the first entry is "now"). Safe to call often; never throws.
 */
export function updateSunWidget(loc: SunWidgetLocation): void {
  try {
    const now = new Date();
    const place = loc.name?.trim() || formatCoords(loc.latitude, loc.longitude);
    const entries = [{ date: now, props: propsForDay(now, loc, place) }];
    for (let i = 1; i <= DAYS_AHEAD; i++) {
      // Local midnight of day `i` (Date handles month/year rollover and DST).
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + i,
      );
      entries.push({
        date: midnight,
        props: propsForDay(midnight, loc, place),
      });
    }
    SunWidget.updateTimeline(entries);
  } catch (e) {
    if (__DEV__) console.warn("[SunWidget] update failed", e);
  }
}
