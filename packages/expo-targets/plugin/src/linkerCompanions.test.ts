import { describe, expect, test } from 'bun:test';

import {
  companionTokensForUnused,
  knownCompanionTokensForPackage,
} from './linkerCompanions';

describe('companionTokensForUnused', () => {
  test('pairs ExpoModulesWorkletsAdapter with unused react-native-worklets', () => {
    expect(
      companionTokensForUnused({
        unusedPackages: ['react-native-worklets'],
        unusedTokens: ['RNWorklets'],
      })
    ).toEqual(['ExpoModulesWorkletsAdapter']);
  });

  test('pairs from RNWorklets token when the npm name differs', () => {
    expect(
      companionTokensForUnused({
        unusedPackages: ['react-native-worklets-core'],
        unusedTokens: ['RNWorklets'],
      })
    ).toEqual(['ExpoModulesWorkletsAdapter']);
  });

  test('does not pair when worklets stays', () => {
    expect(
      companionTokensForUnused({
        unusedPackages: ['@sentry/react-native'],
        unusedTokens: ['RNSentry'],
      })
    ).toEqual([]);
  });
});

describe('knownCompanionTokensForPackage', () => {
  test('attaches the adapter to both worklets package names', () => {
    expect(knownCompanionTokensForPackage('react-native-worklets')).toEqual([
      'ExpoModulesWorkletsAdapter',
    ]);
    expect(
      knownCompanionTokensForPackage('react-native-worklets-core')
    ).toEqual(['ExpoModulesWorkletsAdapter']);
    expect(knownCompanionTokensForPackage('expo-modules-core')).toEqual([]);
  });
});
