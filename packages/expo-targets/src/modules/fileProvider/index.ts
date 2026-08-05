import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import type { TargetConfig } from '../../../plugin/src/config';
import {
  assertMatchesConfig,
  resolveUniqueTarget,
} from '../targetsConfig';

type Native = {
  register: (identifier: string, displayName: string) => Promise<string>;
  unregister: (identifier: string, displayName: string) => Promise<void>;
};

export type FileProviderDomainOpts = {
  targetName?: string;
  /** Assert-only (strict CNG): must match config or throw. */
  identifier?: string;
  /** Assert-only (strict CNG): must match config or throw. */
  displayName?: string;
};

function getNative(): Native {
  if (Platform.OS !== 'ios') {
    throw new Error(
      '[expo-targets] FileProviderDomain is only available on iOS.'
    );
  }
  return requireNativeModule<Native>('ExpoTargetsFileProvider');
}

function resolveDomain(opts?: FileProviderDomainOpts): {
  identifier: string;
  displayName: string;
  target: TargetConfig;
} {
  const target = resolveUniqueTarget('file-provider', opts?.targetName);
  const domain = target.ios?.fileProviderDomain;
  if (!(domain?.identifier && domain?.displayName)) {
    throw new Error(
      `[expo-targets] Target "${target.name}" is missing ios.fileProviderDomain ` +
        `{ identifier, displayName } in expo-target.config.json.`
    );
  }
  assertMatchesConfig('identifier', domain.identifier, opts?.identifier);
  assertMatchesConfig('displayName', domain.displayName, opts?.displayName);
  return {
    identifier: domain.identifier,
    displayName: domain.displayName,
    target,
  };
}

export const FileProviderDomain = {
  async register(opts?: FileProviderDomainOpts): Promise<string> {
    const { identifier, displayName } = resolveDomain(opts);
    return getNative().register(identifier, displayName);
  },

  async unregister(opts?: FileProviderDomainOpts): Promise<void> {
    const { identifier, displayName } = resolveDomain(opts);
    return getNative().unregister(identifier, displayName);
  },
};
