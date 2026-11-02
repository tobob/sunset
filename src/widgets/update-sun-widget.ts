// Android / web: there is no Sunset widget, so this is a no-op.
// The real implementation lives in `update-sun-widget.ios.ts` (picked by Metro on iOS).

export type SunWidgetLocation = {
  latitude: number;
  longitude: number;
  name: string | null;
};

export function updateSunWidget(_loc: SunWidgetLocation): void {}
