import type { AndroidTargetConfig } from '../config';

export const ZXING_CORE_COORD = 'com.google.zxing:core:3.4.1';

/** Gradle `implementation` coordinates from widget android config. */
export function resolveAndroidExtraImplementations(
  android?: AndroidTargetConfig
): string[] {
  const extra = android?.implementation ?? [];
  const coords = extra.filter(
    (c): c is string => typeof c === 'string' && c.length > 0
  );
  if (
    android?.qr === true &&
    !coords.some((c) => c.includes('com.google.zxing:core'))
  ) {
    return [...coords, ZXING_CORE_COORD];
  }
  return coords;
}

export function appendGradleImplementations(
  contents: string,
  coordinates: string[]
): string {
  if (coordinates.length === 0) {
    return contents;
  }
  let next = contents;
  for (const coord of coordinates) {
    if (next.includes(coord)) {
      continue;
    }
    if (!/dependencies\s*\{/.test(next)) {
      continue;
    }
    next = next.replace(
      /dependencies\s*\{/,
      (match) => `${match}\n    implementation("${coord}")`
    );
  }
  return next;
}
