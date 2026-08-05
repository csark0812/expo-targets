import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import type { TargetConfig } from '../../../plugin/src/config';
import {
  assertMatchesConfig,
  resolveUniqueTarget,
} from '../targetsConfig';

type Native = {
  reload: (identifier: string) => Promise<string>;
};

export type ContentBlockerReloadOpts = {
  targetName?: string;
  /** Assert-only (strict CNG): must match derived bundle id or throw. */
  identifier?: string;
};

function getNative(): Native {
  if (Platform.OS !== 'ios') {
    throw new Error('[expo-targets] ContentBlocker is only available on iOS.');
  }
  return requireNativeModule<Native>('ExpoTargetsContentBlocker');
}

function resolveBundleId(target: TargetConfig): string {
  const fromConfig = target.ios?.bundleIdentifier;
  if (fromConfig && !fromConfig.startsWith('.')) {
    return fromConfig;
  }
  throw new Error(
    `[expo-targets] Content blocker "${target.name}" needs ios.bundleIdentifier ` +
      `(absolute) in expo-target.config.json so reload can resolve the extension id.`
  );
}

export const ContentBlocker = {
  async reload(opts?: ContentBlockerReloadOpts): Promise<string> {
    const target = resolveUniqueTarget('content-blocker', opts?.targetName);
    const identifier = resolveBundleId(target);
    assertMatchesConfig('identifier', identifier, opts?.identifier);
    return getNative().reload(identifier);
  },
};
