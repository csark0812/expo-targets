/**
 * Narrowed by ambient `.expo/types/expo-targets.d.ts` after generate/prebuild
 * (same idea as Expo Router typed routes — no value import from `.expo/`).
 *
 * Until types are generated, both resolve to `string`.
 * Empty interfaces are intentional — apps augment them via codegen.
 */
// biome-ignore lint/suspicious/noEmptyInterface: module augmentation target
export interface KnownTargets {}
// biome-ignore lint/suspicious/noEmptyInterface: module augmentation target
export interface KnownLiveActivityAttributes {}

// biome-ignore lint/suspicious/noEmptyInterface: module augmentation target
export interface KnownWidgetKinds {}

// biome-ignore lint/suspicious/noEmptyInterface: module augmentation target
export interface KnownMultiProductWidgetFolders {}

/** Filled by codegen with per-attributesName payload shapes. */
// biome-ignore lint/suspicious/noEmptyInterface: module augmentation target
export interface LiveActivityPayloadRegistry {}

export type TargetName = [keyof KnownTargets] extends [never]
  ? string
  : keyof KnownTargets & string;

export type WidgetKindName = [keyof KnownWidgetKinds] extends [never]
  ? string
  : keyof KnownWidgetKinds & string;

export type MultiProductWidgetFolderName = [
  keyof KnownMultiProductWidgetFolders,
] extends [never]
  ? string
  : keyof KnownMultiProductWidgetFolders & string;

export type LiveActivityAttributesName = [
  keyof KnownLiveActivityAttributes,
] extends [never]
  ? string
  : keyof KnownLiveActivityAttributes & string;

export type LiveActivityPayloadFor<N extends string> =
  N extends keyof LiveActivityPayloadRegistry
    ? LiveActivityPayloadRegistry[N]
    : {
        attributes: Record<string, string | number | boolean>;
        contentState: Record<string, string | number | boolean>;
      };
