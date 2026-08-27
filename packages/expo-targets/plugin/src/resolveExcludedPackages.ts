import type { ExtensionType } from './config';
import { REACT_NATIVE_NATIVE_TYPES } from './domain';
import { unusedHeavyPackages } from './entryGraph';

/** Host-only Expo packages that crash / blank RN appex processes. Always merged in. */
export const HOST_ONLY_EXCLUDED_PACKAGES = [
  'expo-updates',
  'expo-dev-client',
  'expo-dev-launcher',
  'expo-dev-menu',
] as const;

export type ResolveExcludedPackagesInput = {
  type: ExtensionType | string;
  entry?: string;
  excludedPackages?: string[];
  /** When set, unused heavy host packages are union-merged (Sentry, reanimated, …). */
  projectRoot?: string;
};

function isRnNativeType(type: string): boolean {
  return (REACT_NATIVE_NATIVE_TYPES as string[]).includes(type);
}

/**
 * Resolve Expo packages to strip from a nested RN extension's ExpoModulesProvider.
 * For RN-native targets with an `entry`, always union-merge HOST_ONLY_EXCLUDED_PACKAGES
 * (no escape hatch). User lists are additive only.
 */
export function resolveExcludedPackages(
  input: ResolveExcludedPackagesInput
): string[] | undefined {
  const { type, entry, excludedPackages, projectRoot } = input;
  if (!(entry && isRnNativeType(type))) {
    return excludedPackages?.length ? [...excludedPackages] : undefined;
  }

  const inferred =
    projectRoot && entry ? unusedHeavyPackages({ projectRoot, entry }) : [];

  const merged = new Set<string>([
    ...HOST_ONLY_EXCLUDED_PACKAGES,
    ...(excludedPackages ?? []),
    ...inferred,
  ]);
  return [...merged];
}
