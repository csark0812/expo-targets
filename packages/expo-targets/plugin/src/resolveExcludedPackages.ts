import type { ExtensionType } from './config';
import { REACT_NATIVE_NATIVE_TYPES } from './domain';

/** Host-only Expo packages that crash / blank RN appex processes. Always merged in. */
export const HOST_ONLY_EXCLUDED_PACKAGES = [
  'expo-updates',
  'expo-dev-client',
] as const;

export type ResolveExcludedPackagesInput = {
  type: ExtensionType | string;
  entry?: string;
  excludedPackages?: string[];
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
  const { type, entry, excludedPackages } = input;
  if (!(entry && isRnNativeType(type))) {
    return excludedPackages?.length ? [...excludedPackages] : undefined;
  }

  const merged = new Set<string>([
    ...HOST_ONLY_EXCLUDED_PACKAGES,
    ...(excludedPackages ?? []),
  ]);
  return [...merged];
}
