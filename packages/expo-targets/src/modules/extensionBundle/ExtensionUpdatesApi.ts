/**
 * Host API for sideloading extension bundles after expo-updates.
 * Prefer `ExtensionUpdates.enable()` — auto-runs on the host when this package loads.
 */

import {
  createExtensionUpdates,
  type ExtensionUpdatesOptions,
} from './ExtensionUpdates';
import {
  type EnableExtensionUpdatesOptions,
  enableExtensionUpdates,
} from './enableExtensionUpdates';

export type { EnableExtensionUpdatesOptions, ExtensionUpdatesOptions };

export const ExtensionUpdates = {
  /** Wire App Group sync from the running update (defaults from expo.extra.targets). */
  enable: enableExtensionUpdates,
  /** Low-level Updates-shaped helper (tests / custom install). */
  create: createExtensionUpdates,
};

let didAutoEnable = false;

/** Pure host gate — unit-tested. */
export function shouldAutoEnableExtensionUpdates(opts: {
  isAppExtension: boolean;
  hasExpoUpdates: boolean;
  hasExtensionBundle: boolean;
}): boolean {
  return !opts.isAppExtension && opts.hasExpoUpdates && opts.hasExtensionBundle;
}

/**
 * True when running inside an iOS app extension process (.appex).
 */
export function isAppExtensionProcess(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require('react-native') as {
      Platform: { OS: string };
    };
    if (Platform.OS !== 'ios') {
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isAppExtension } = require('../storage/index') as {
      isAppExtension: () => boolean;
    };
    return isAppExtension();
  } catch {
    return false;
  }
}

/**
 * Host-only auto-enable. No-ops in appexes and in Node.
 * Safe to call from the package entry.
 *
 * Gate: must have ExpoUpdates native (stripped from RN appexes) and must not
 * be an .appex process. `ExpoTargetsExtensionBundle` alone is insufficient —
 * it currently ships in ExpoTargetsStorage and is linked into extensions.
 */
export function autoEnableExtensionUpdates(): void {
  if (didAutoEnable) {
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule, requireOptionalNativeModule } =
      require('expo-modules-core') as {
        requireNativeModule: (name: string) => unknown;
        requireOptionalNativeModule: (name: string) => unknown;
      };

    const isAppex = isAppExtensionProcess();
    const expoUpdatesModule = requireOptionalNativeModule('ExpoUpdates');
    const hasExpoUpdates =
      expoUpdatesModule !== undefined && expoUpdatesModule !== null;
    let hasExtensionBundle = false;
    try {
      requireNativeModule('ExpoTargetsExtensionBundle');
      hasExtensionBundle = true;
    } catch {
      hasExtensionBundle = false;
    }

    if (
      !shouldAutoEnableExtensionUpdates({
        isAppExtension: isAppex,
        hasExpoUpdates,
        hasExtensionBundle,
      })
    ) {
      return;
    }
  } catch {
    return;
  }
  didAutoEnable = true;
  try {
    ExtensionUpdates.enable();
  } catch {
    // Never crash host / extension startup on sync wiring failures.
  }
}
