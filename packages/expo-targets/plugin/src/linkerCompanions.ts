/**
 * Optional native pods that live on a kept package (often expo-modules-core)
 * but only link when another autolinked package is present.
 *
 * Invert is package-granular. Without this closure, stripping `react-native-worklets`
 * drops `-lRNWorklets` while `-framework ExpoModulesWorkletsAdapter` stays and
 * ld fails on `worklets::`.
 */

export type LinkerCompanion = {
  tokens: readonly string[];
  requiresAnyPackage: readonly string[];
  requiresAnyToken?: readonly string[];
};

export const OPTIONAL_LINKER_COMPANIONS: readonly LinkerCompanion[] = [
  {
    tokens: ['ExpoModulesWorkletsAdapter'],
    requiresAnyPackage: [
      'react-native-worklets',
      'react-native-worklets-core',
    ],
    requiresAnyToken: ['RNWorklets'],
  },
];

function companionApplies(
  companion: LinkerCompanion,
  unusedPackages: ReadonlySet<string>,
  unusedTokens: ReadonlySet<string>
): boolean {
  for (const name of companion.requiresAnyPackage) {
    if (unusedPackages.has(name)) {
      return true;
    }
  }
  for (const token of companion.requiresAnyToken ?? []) {
    if (unusedTokens.has(token)) {
      return true;
    }
  }
  return false;
}

/** Extra strip tokens for unused packages, even when a kept package owns them. */
export function companionTokensForUnused(opts: {
  unusedPackages: readonly string[];
  unusedTokens?: readonly string[];
}): string[] {
  const unusedPackages = new Set(opts.unusedPackages);
  const unusedTokens = new Set(opts.unusedTokens ?? []);
  const extra = new Set<string>();
  for (const companion of OPTIONAL_LINKER_COMPANIONS) {
    if (companionApplies(companion, unusedPackages, unusedTokens)) {
      for (const token of companion.tokens) {
        extra.add(token);
      }
    }
  }
  return [...extra];
}

export function knownCompanionTokensForPackage(packageName: string): string[] {
  const tokens = new Set<string>();
  for (const companion of OPTIONAL_LINKER_COMPANIONS) {
    if (companion.requiresAnyPackage.includes(packageName)) {
      for (const token of companion.tokens) {
        tokens.add(token);
      }
    }
  }
  return [...tokens];
}
