/**
 * Updates-shaped host API for sideloading extension bundles after expo-updates.
 * Does not run inside the appex. Optional peer: expo-updates.
 */

export type ExtensionBundleManifest = {
  byteLength: number;
  sha256: string;
  installedAt: string;
  runtimeVersion: string;
  targetName: string;
  type: string;
};

export type ExtensionUpdatesCheckResult = {
  isAvailable: boolean;
  manifest?: Record<string, unknown>;
  reason?: string;
};

export type ExtensionUpdatesFetchResult = {
  isNew: boolean;
  installed: ExtensionBundleManifest[];
  reason?: string;
};

type UpdatesLike = {
  checkForUpdateAsync: () => Promise<{
    isAvailable: boolean;
    manifest?: Record<string, unknown>;
    reason?: string;
  }>;
  fetchUpdateAsync: () => Promise<{
    isNew: boolean;
    manifest?: Record<string, unknown>;
  }>;
  reloadAsync: () => Promise<void>;
  runtimeVersion?: string | null;
};

export type ExtensionUpdatesSyncTarget = {
  targetName: string;
  type: string;
  runtimeVersion?: string;
};

export type ExtensionUpdatesOptions = {
  resolveAssetPath: (
    targetName: string
  ) => string | null | Promise<string | null>;
  install: (opts: {
    targetName: string;
    type: string;
    runtimeVersion: string;
    localPath: string;
  }) => Promise<ExtensionBundleManifest>;
  getUpdates?: () => UpdatesLike | null;
  targets: ExtensionUpdatesSyncTarget[];
};

function defaultGetUpdates(): UpdatesLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-updates') as UpdatesLike;
  } catch {
    return null;
  }
}

export function createExtensionUpdates(options: ExtensionUpdatesOptions) {
  const getUpdates = options.getUpdates ?? defaultGetUpdates;

  async function checkForUpdateAsync(): Promise<ExtensionUpdatesCheckResult> {
    const Updates = getUpdates();
    if (!Updates) {
      return {
        isAvailable: false,
        reason: 'expo-updates is not installed',
      };
    }
    const result = await Updates.checkForUpdateAsync();
    return {
      isAvailable: result.isAvailable,
      manifest: result.manifest,
      reason: result.reason,
    };
  }

  async function syncInstalledTargets(
    runtimeVersion: string
  ): Promise<ExtensionBundleManifest[]> {
    const installed: ExtensionBundleManifest[] = [];
    for (const t of options.targets) {
      const localPath = await options.resolveAssetPath(t.targetName);
      if (!localPath) {
        continue;
      }
      const rv = t.runtimeVersion ?? runtimeVersion;
      if (!rv) {
        throw new Error(
          `runtimeVersion required to sync extension bundle "${t.targetName}"`
        );
      }
      installed.push(
        await options.install({
          targetName: t.targetName,
          type: t.type,
          runtimeVersion: rv,
          localPath,
        })
      );
    }
    return installed;
  }

  async function fetchUpdateAsync(): Promise<ExtensionUpdatesFetchResult> {
    const Updates = getUpdates();
    if (!Updates) {
      return {
        isNew: false,
        installed: [],
        reason: 'expo-updates is not installed',
      };
    }
    const result = await Updates.fetchUpdateAsync();
    const runtimeVersion =
      Updates.runtimeVersion ??
      (typeof result.manifest?.runtimeVersion === 'string'
        ? result.manifest.runtimeVersion
        : '');
    if (!result.isNew) {
      return { isNew: false, installed: [] };
    }
    if (!runtimeVersion) {
      throw new Error(
        'runtimeVersion unresolved after fetchUpdateAsync — fail closed'
      );
    }
    const installed = await syncInstalledTargets(runtimeVersion);
    return { isNew: true, installed };
  }

  async function reloadAsync(): Promise<void> {
    const Updates = getUpdates();
    if (!Updates) {
      throw new Error('expo-updates is not installed');
    }
    await Updates.reloadAsync();
  }

  return {
    checkForUpdateAsync,
    fetchUpdateAsync,
    reloadAsync,
    syncFromCurrentUpdate: async () => {
      const Updates = getUpdates();
      const runtimeVersion = Updates?.runtimeVersion ?? '';
      if (!runtimeVersion) {
        throw new Error('runtimeVersion unresolved — fail closed');
      }
      return syncInstalledTargets(runtimeVersion);
    },
  };
}
