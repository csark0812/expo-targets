import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface SharedData {
  text?: string;
  url?: string;
  images?: string[];
  webpageUrl?: string;
  webpageTitle?: string;
  preprocessedData?: any;
}

type ExtensionNativeModule = {
  closeExtension: () => void;
  openHostApp: (path: string) => void;
  getSharedData: () => SharedData | null;
};

let cachedModule: ExtensionNativeModule | null | undefined;

function isExtensionPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Resolve the ExpoTargetsExtension native module.
 * Returns null when unavailable (wrong platform, missing native build, or host app).
 */
export function getExtensionNativeModule(): ExtensionNativeModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  if (!isExtensionPlatform()) {
    cachedModule = null;
    return null;
  }
  try {
    cachedModule = requireNativeModule(
      'ExpoTargetsExtension'
    ) as ExtensionNativeModule;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

function requireExtensionModule(action: string): ExtensionNativeModule {
  const mod = getExtensionNativeModule();
  if (mod) {
    return mod;
  }
  if (!isExtensionPlatform()) {
    throw new Error(
      `[expo-targets] ${action} is only available on iOS/Android extension surfaces. ` +
        `Current platform: ${Platform.OS}.`
    );
  }
  throw new Error(
    `[expo-targets] ${action} failed: native module "ExpoTargetsExtension" is unavailable. ` +
      'Run this inside a share/action (iOS appex or Android target Activity) after `npx expo prebuild` ' +
      '(or `expo-targets sync` on bare RN), and ensure the host embeds expo-targets.'
  );
}

/**
 * Cross-type RN extension lifecycle helpers (share, action, clip, messages).
 *
 * Contract:
 * - Call from the extension JS bundle (not Expo Go).
 * - `createTarget(name, Component)` registers the component via AppRegistry; `name` must match config.
 * - `getSharedData` / `close` / `openHostApp` require the ExpoTargetsExtension native module.
 * - Messages adds APIs on top of this contract (see Messages module).
 * - Android: requires a target Activity (Wave 0 harness or Wave 1 Share/Action Activity).
 */
export class Extension {
  /** Dismiss the extension UI (share/action). */
  close() {
    requireExtensionModule('close()').closeExtension();
  }

  /** Open the host app, optionally with a path/URL fragment. */
  openHostApp(path = '') {
    requireExtensionModule('openHostApp()').openHostApp(path);
  }

  /** Read content shared into the extension (text, URLs, images, …). */
  getSharedData(): SharedData | null {
    return requireExtensionModule('getSharedData()').getSharedData();
  }
}

export const close = () => {
  new Extension().close();
};

export const openHostApp = (path = '') => {
  new Extension().openHostApp(path);
};

export const getSharedData = (): SharedData | null => {
  return new Extension().getSharedData();
};

export type { SharedData as ExtensionSharedData };
