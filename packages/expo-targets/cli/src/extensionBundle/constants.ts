/** Max sideloaded main.jsbundle bytes by RN-native extension type. */
export const EXTENSION_BUNDLE_MAX_BYTES: Record<string, number> = {
  share: 5 * 1024 * 1024,
  action: 5 * 1024 * 1024,
  messages: 5 * 1024 * 1024,
  'notification-content': 5 * 1024 * 1024,
  clip: 8 * 1024 * 1024,
};

export const EXTENSION_BUNDLE_REL_ROOT = 'expo-targets/bundles';

export function maxBytesForType(type: string): number {
  const max = EXTENSION_BUNDLE_MAX_BYTES[type];
  if (max === undefined) {
    throw new Error(
      `No sideload size cap for extension type "${type}". Supported: ${Object.keys(EXTENSION_BUNDLE_MAX_BYTES).join(', ')}`
    );
  }
  return max;
}

/** Publish / update-asset relative path for a target. */
export function publishBundleRelPath(targetName: string): string {
  return `${EXTENSION_BUNDLE_REL_ROOT}/${targetName}/main.jsbundle`;
}

export function publishManifestRelPath(targetName: string): string {
  return `${EXTENSION_BUNDLE_REL_ROOT}/${targetName}/manifest.json`;
}

export type ExtensionBundleManifest = {
  byteLength: number;
  sha256: string;
  installedAt: string;
  runtimeVersion: string;
  targetName: string;
  type: string;
};

export type PublishSidecar = {
  runtimeVersion: string;
  targetName: string;
  type: string;
};
