import {
  type AutolinkedNativePackage,
  linkerTokensForPackages,
  listAutolinkedNativePackages,
  normalizeAutolinkedPackages,
} from './autolinkedPackages';
import type { ExtensionType } from './config';
import { REACT_NATIVE_NATIVE_TYPES } from './domain';
import { unusedAutolinkedPackages } from './entryGraph';

/** Host-only Expo packages that crash / blank RN appex processes. Always merged in. */
export const HOST_ONLY_EXCLUDED_PACKAGES = [
  'expo-updates',
  'expo-dev-client',
  'expo-dev-launcher',
  'expo-dev-menu',
] as const;

export type NativeLinkMode = 'entry' | 'host';

export type ResolveExcludedPackagesInput = {
  type: ExtensionType | string;
  entry?: string;
  /** Force-strip only. Never a keep-list. */
  excludedPackages?: string[];
  /** When set, unused autolinked host packages are inverted out. */
  projectRoot?: string;
  /** Injected autolinked set (tests). When omitted, loaded from projectRoot. */
  autolinkedPackages?: readonly (string | AutolinkedNativePackage)[];
  /** Force-keep even when the entry does not import them. */
  linkedPackages?: string[];
  /**
   * `entry` (default): invert unused autolinked packages off provider + linker.
   * `host`: old fat copy — invert off; still force-strip HOST_ONLY + user list.
   */
  nativeLink?: NativeLinkMode;
};

export type ResolvedNativeUnlink = {
  packages: string[];
  linkerTokens: string[];
};

function isRnNativeType(type: string): boolean {
  return (REACT_NATIVE_NATIVE_TYPES as string[]).includes(type);
}

function loadAutolinked(
  input: ResolveExcludedPackagesInput
): AutolinkedNativePackage[] {
  if (input.autolinkedPackages) {
    return normalizeAutolinkedPackages(input.autolinkedPackages);
  }
  if (input.projectRoot) {
    return listAutolinkedNativePackages(input.projectRoot);
  }
  return [];
}

/**
 * Resolve Expo + RN packages to strip from a nested RN extension.
 * Invert: autolinked − (core ∪ entry imports ∪ linkedPackages).
 * User `excludedPackages` is force-strip only. HOST_ONLY always merges.
 */
export function resolveNativeUnlink(
  input: ResolveExcludedPackagesInput
): ResolvedNativeUnlink | undefined {
  const { type, entry, excludedPackages, projectRoot } = input;
  if (!(entry && isRnNativeType(type))) {
    if (!excludedPackages?.length) {
      return;
    }
    return {
      packages: [...excludedPackages],
      linkerTokens: linkerTokensForPackages(excludedPackages, []),
    };
  }

  const nativeLink = input.nativeLink ?? 'entry';
  const autolinked = loadAutolinked(input);
  const inferred =
    nativeLink === 'entry' && projectRoot
      ? unusedAutolinkedPackages({
          projectRoot,
          entry,
          autolinked: autolinked.map((pkg) => pkg.packageName),
          linkedPackages: input.linkedPackages,
        })
      : [];

  const packages = [
    ...new Set<string>([
      ...HOST_ONLY_EXCLUDED_PACKAGES,
      ...(excludedPackages ?? []),
      ...inferred,
    ]),
  ];

  return {
    packages,
    linkerTokens:
      nativeLink === 'host'
        ? []
        : linkerTokensForPackages(packages, autolinked),
  };
}

/**
 * Resolve Expo packages to strip from a nested RN extension's ExpoModulesProvider.
 * For RN-native targets with an `entry`, always union-merge HOST_ONLY_EXCLUDED_PACKAGES
 * (no escape hatch). User lists are force-strip only.
 */
export function resolveExcludedPackages(
  input: ResolveExcludedPackagesInput
): string[] | undefined {
  return resolveNativeUnlink(input)?.packages;
}
