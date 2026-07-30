import { TYPE_BUNDLE_IDENTIFIER_SUFFIXES } from '../config';
import type { ExtensionType } from './types';

/**
 * Bundle identifier suffix per extension type (e.g. `share` -> `<app>.share`).
 * The map lives in `../config` as part of the documented config surface.
 */
export { TYPE_BUNDLE_IDENTIFIER_SUFFIXES };

export function bundleIdentifierSuffixForType(
  type: ExtensionType
): string | undefined {
  return TYPE_BUNDLE_IDENTIFIER_SUFFIXES[type];
}
