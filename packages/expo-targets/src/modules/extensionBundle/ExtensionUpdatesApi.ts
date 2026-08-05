/**
 * Host API for sideloading extension bundles after expo-updates.
 * Prefer `ExtensionUpdates.enable()` — auto-runs on the host when this package loads.
 */

import {
  createExtensionUpdates,
  type ExtensionUpdatesOptions,
} from './ExtensionUpdates';
import {
  enableExtensionUpdates,
  type EnableExtensionUpdatesOptions,
} from './enableExtensionUpdates';

export type { EnableExtensionUpdatesOptions, ExtensionUpdatesOptions };

export const ExtensionUpdates = {
  /** Wire App Group sync from the running update (defaults from expo.extra.targets). */
  enable: enableExtensionUpdates,
  /** Low-level Updates-shaped helper (tests / custom install). */
  create: createExtensionUpdates,
};

let didAutoEnable = false;

/**
 * Host-only auto-enable. No-ops in appexes (ExtensionBundle native module absent)
 * and in Node. Safe to call from the package entry.
 */
export function autoEnableExtensionUpdates(): void {
  if (didAutoEnable) {
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: (name: string) => unknown;
    };
    requireNativeModule('ExpoTargetsExtensionBundle');
  } catch {
    return;
  }
  didAutoEnable = true;
  ExtensionUpdates.enable();
}
