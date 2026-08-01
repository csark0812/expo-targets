import { TYPE_CHARACTERISTICS } from './characteristics';
import type { ExtensionType } from './types';

/**
 * React Native compatibility, expressed as flags on `TYPE_CHARACTERISTICS`.
 * The arrays below are kept explicit for error messages and docs;
 * `characteristics.test.ts` asserts they stay in sync with the flags.
 */

/** Types that render real React Native with native modules. */
export const REACT_NATIVE_NATIVE_TYPES: ExtensionType[] = [
  'share',
  'action',
  'clip',
  'messages',
];

/** Types that render React Native Web inside a web view. */
export const REACT_NATIVE_WEB_TYPES: ExtensionType[] = ['safari'];

/** Every type that accepts an `entry` field. */
export const REACT_NATIVE_COMPATIBLE_TYPES: ExtensionType[] = [
  ...REACT_NATIVE_NATIVE_TYPES,
  ...REACT_NATIVE_WEB_TYPES,
];

export function isReactNativeNative(type: ExtensionType): boolean {
  return TYPE_CHARACTERISTICS[type].isReactNativeNative;
}

export function isReactNativeWeb(type: ExtensionType): boolean {
  return TYPE_CHARACTERISTICS[type].isReactNativeWeb;
}

export function isReactNativeCompatible(type: ExtensionType): boolean {
  return isReactNativeNative(type) || isReactNativeWeb(type);
}
