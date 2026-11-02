/**
 * Sunrise / sunset calculation based on the NOAA solar calculator
 * (https://gml.noaa.gov/grad/solcalc/calcdetails.html). Pure TypeScript,
 * no dependencies, works fully offline. Accuracy is typically within a minute
 * for latitudes between ±72°.
 */

export type SunTimes = {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
  dayLengthMinutes: number;
  /** 'day' = sun never sets (midnight sun), 'night' = sun never rises (polar night). */
  polar: 'day' | 'night' | null;
};

const MS_PER_MIN = 60_000;
const MS_PER_DAY = 86_400_000;
/** Standard altitude of the sun's centre at sunrise/sunset (refraction + semi-diameter). */
const SUN_ALTITUDE_DEG = -0.833;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function toJulianCentury(ms: number): number {
  const jd = ms / MS_PER_DAY + 2440587.5;
  return (jd - 2451545) / 36525;
}

/** Returns solar declination (radians) and equation of time (minutes) at the given instant. */
function solarPosition(ms: number): { declination: number; eqTime: number } {
  const t = toJulianCentury(ms);
  const l0 = (((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360) + 360) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const mRad = rad(m);
  const center =
    Math.sin(mRad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * mRad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * mRad) * 0.000289;
  const trueLong = l0 + center;
  const omega = rad(125.04 - 1934.136 * t);
  const apparentLong = trueLong - 0.00569 - 0.00478 * Math.sin(omega);
  const meanObliquity = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = rad(meanObliquity + 0.00256 * Math.cos(omega));
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(rad(apparentLong)));

  const y = Math.tan(obliquity / 2) ** 2;
  const l0Rad = rad(l0);
  const eqTime =
    4 *
    deg(
      y * Math.sin(2 * l0Rad) -
        2 * e * Math.sin(mRad) +
        4 * e * y * Math.sin(mRad) * Math.cos(2 * l0Rad) -
        0.5 * y * y * Math.sin(4 * l0Rad) -
        1.25 * e * e * Math.sin(2 * mRad),
    );
  return { declination, eqTime };
}

/** Cosine of the hour angle at which the sun reaches the standard altitude. */
function cosHourAngle(latitude: number, declination: number): number {
  const lat = rad(latitude);
  return (
    (Math.sin(rad(SUN_ALTITUDE_DEG)) - Math.sin(lat) * Math.sin(declination)) /
    (Math.cos(lat) * Math.cos(declination))
  );
}

/**
 * Computes sunrise, sunset and solar noon for the local calendar day (device
 * timezone) that contains `date`.
 * @param longitude degrees, positive east.
 */
export function getSunTimes(date: Date, latitude: number, longitude: number): SunTimes {
  const localNoon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTime();
  // UTC day (ms at 00:00 UTC) whose solar transit falls closest to local noon.
  const dayStart =
    Math.round((localNoon - (720 - 4 * longitude) * MS_PER_MIN) / MS_PER_DAY) * MS_PER_DAY;

  // Minutes after 00:00 UTC of `dayStart` for an event at the given hour angle (degrees).
  const eventAt = (hourAngle: number, eqTime: number) =>
    dayStart + (720 - 4 * (longitude + hourAngle) - eqTime) * MS_PER_MIN;

  // Solar noon, refined by re-evaluating the equation of time at the estimate.
  let noon = eventAt(0, solarPosition(dayStart + 12 * 60 * MS_PER_MIN).eqTime);
  noon = eventAt(0, solarPosition(noon).eqTime);
  const noonPos = solarPosition(noon);

  const cosNoon = cosHourAngle(latitude, noonPos.declination);
  if (cosNoon > 1 || cosNoon < -1) {
    const polar = cosNoon > 1 ? 'night' : 'day';
    return {
      sunrise: null,
      sunset: null,
      solarNoon: new Date(noon),
      dayLengthMinutes: polar === 'day' ? 1440 : 0,
      polar,
    };
  }

  // Iteratively refine an event: sign = +1 for sunrise (east), -1 for sunset (west).
  const refine = (sign: 1 | -1): number | null => {
    let t = eventAt(sign * deg(Math.acos(cosNoon)), noonPos.eqTime);
    for (let i = 0; i < 3; i++) {
      const pos = solarPosition(t);
      const c = cosHourAngle(latitude, pos.declination);
      if (c > 1 || c < -1) return i === 0 ? null : t;
      t = eventAt(sign * deg(Math.acos(c)), pos.eqTime);
    }
    return t;
  };

  const sunrise = refine(1);
  const sunset = refine(-1);
  const dayLengthMinutes =
    sunrise !== null && sunset !== null ? Math.round((sunset - sunrise) / MS_PER_MIN) : 0;

  return {
    sunrise: sunrise !== null ? new Date(sunrise) : null,
    sunset: sunset !== null ? new Date(sunset) : null,
    solarNoon: new Date(noon),
    dayLengthMinutes,
    polar: null,
  };
}
