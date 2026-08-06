import { requireNativeModule } from 'expo-modules-core';

import type { ExtensionBundleManifest } from './ExtensionUpdates';

type NativeExtensionBundle = {
  install: (
    appGroup: string,
    targetName: string,
    type: string,
    runtimeVersion: string,
    localPath: string
  ) => Promise<ExtensionBundleManifest>;
  clear: (appGroup: string, targetName: string) => void;
  getInfo: (
    appGroup: string,
    targetName: string
  ) => ExtensionBundleManifest | null;
};

let native: NativeExtensionBundle | null | undefined;

function getNative(): NativeExtensionBundle {
  if (native === undefined) {
    try {
      native = requireNativeModule<NativeExtensionBundle>(
        'ExpoTargetsExtensionBundle'
      );
    } catch {
      native = null;
    }
  }
  if (!native) {
    throw new Error(
      'ExpoTargetsExtensionBundle native module is unavailable (host iOS build required)'
    );
  }
  return native;
}

/** Install a local jsbundle into the App Group (host process). */
export async function installExtensionBundleNative(opts: {
  appGroup: string;
  targetName: string;
  type: string;
  runtimeVersion: string;
  localPath: string;
}): Promise<ExtensionBundleManifest> {
  return getNative().install(
    opts.appGroup,
    opts.targetName,
    opts.type,
    opts.runtimeVersion,
    opts.localPath
  );
}

export function clearExtensionBundleNative(
  appGroup: string,
  targetName: string
): void {
  getNative().clear(appGroup, targetName);
}

export function getExtensionBundleInfoNative(
  appGroup: string,
  targetName: string
): ExtensionBundleManifest | null {
  return getNative().getInfo(appGroup, targetName);
}
