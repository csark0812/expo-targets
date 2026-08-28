/**
 * One-call host wiring: sync extension bundles from the running update into the
 * App Group whenever the app starts (and after Updates fetch via the returned API).
 */

import {
  createExtensionUpdates,
  type ExtensionUpdatesOptions,
  type ExtensionUpdatesSyncTarget,
} from './ExtensionUpdates';

const RN_NATIVE = new Set([
  'share',
  'action',
  'clip',
  'messages',
  'notification-content',
]);

export type EnableExtensionUpdatesOptions = {
  appGroup?: string;
  assetModules?: Record<string, number>;
  targets?: ExtensionUpdatesSyncTarget[];
  /** Sync immediately on enable (default true). */
  syncOnStart?: boolean;
  getUpdates?: ExtensionUpdatesOptions['getUpdates'];
  /** Override install / resolve for tests. */
  install?: ExtensionUpdatesOptions['install'];
  resolveAssetPath?: ExtensionUpdatesOptions['resolveAssetPath'];
  onError?: (error: unknown) => void;
};

function rnNativeSyncTargets(): {
  targets: ExtensionUpdatesSyncTarget[];
  appGroup?: string;
} {
  try {
    // Lazy: avoid expo-constants / RN in Node unit tests that inject targets.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { listTargets } = require('../targetsConfig') as {
      listTargets: () => Array<{
        type?: string;
        entry?: string;
        name?: string;
        appGroup?: string;
      }>;
    };
    const listed = listTargets().filter(
      (t) => t.type && RN_NATIVE.has(t.type) && t.entry && t.name
    );
    return {
      targets: listed.map((t) => ({
        targetName: t.name as string,
        type: t.type as string,
      })),
      appGroup: listed.find((t) => t.appGroup)?.appGroup,
    };
  } catch {
    return { targets: [] };
  }
}

function loadBundledAssetModules(): Record<string, number> {
  try {
    // withTargets: assets/expo-targets/extensionBundleModules.js, else packaged stub
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-targets/extension-bundle-assets') as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function attachUpdatesListener(
  sync: () => Promise<unknown>,
  onError: (error: unknown) => void
): { remove: () => void } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Updates = require('expo-updates') as {
      addUpdatesStateChangeListener?: (
        listener: (event: {
          context: { isUpdatePending?: boolean; isDownloading?: boolean };
        }) => void
      ) => { remove: () => void };
    };
    if (typeof Updates.addUpdatesStateChangeListener !== 'function') {
      return null;
    }
    // After a pending update is applied the next cold start re-runs enable + syncOnStart.
    // While pending, assets still belong to the running update — sync current only.
    return Updates.addUpdatesStateChangeListener((event) => {
      if (event.context.isDownloading) {
        return;
      }
      void sync().catch(onError);
    });
  } catch {
    return null;
  }
}

/**
 * Enable host→App Group extension bundle sync with minimal app code.
 *
 * ```ts
 * import { ExtensionUpdates } from 'expo-targets';
 * ExtensionUpdates.enable(); // optional — auto-enabled on host import
 * ```
 *
 * Publish: `npx expo-targets export-extension-bundles` then `eas update`.
 */
export function enableExtensionUpdates(
  options: EnableExtensionUpdatesOptions = {}
) {
  const needsDiscovery = !(options.targets && options.appGroup);
  const discovered = needsDiscovery
    ? rnNativeSyncTargets()
    : { targets: [] as ExtensionUpdatesSyncTarget[], appGroup: undefined };
  const targets = options.targets ?? discovered.targets;
  const appGroup = options.appGroup ?? discovered.appGroup;
  const onError =
    options.onError ??
    ((error: unknown) => {
      console.warn('[expo-targets] extension update sync failed', error);
    });

  if (targets.length === 0) {
    return {
      enabled: false as const,
      reason: 'no RN-native targets with entry',
    };
  }

  const assetModules = options.assetModules ?? loadBundledAssetModules();
  const api = createExtensionUpdates({
    appGroup,
    assetModules,
    targets,
    getUpdates: options.getUpdates,
    install: options.install,
    resolveAssetPath: options.resolveAssetPath,
  });

  const sync = () => api.syncFromCurrentUpdate();

  if (options.syncOnStart !== false) {
    void sync().catch(onError);
  }

  const subscription = attachUpdatesListener(sync, onError);

  return {
    enabled: true as const,
    appGroup,
    targets,
    ...api,
    unsubscribe: () => subscription?.remove(),
  };
}
