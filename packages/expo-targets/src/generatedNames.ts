/**
 * Narrowed by ambient `.expo/types/expo-targets.d.ts` after generate/prebuild
 * (same idea as Expo Router typed routes — no value import from `.expo/`).
 *
 * Until types are generated, both resolve to `string`.
 */
export interface KnownTargets {}
export interface KnownLiveActivityAttributes {}

export type TargetName = [keyof KnownTargets] extends [never]
  ? string
  : keyof KnownTargets & string;

export type LiveActivityAttributesName =
  [keyof KnownLiveActivityAttributes] extends [never]
    ? string
    : keyof KnownLiveActivityAttributes & string;
