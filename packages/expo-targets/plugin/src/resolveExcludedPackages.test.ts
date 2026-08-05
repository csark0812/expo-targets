import { describe, expect, test } from 'bun:test';

import {
  HOST_ONLY_EXCLUDED_PACKAGES,
  resolveExcludedPackages,
} from './resolveExcludedPackages';

describe('resolveExcludedPackages', () => {
  test('omitted list → force-merges host-only packages for RN entry', () => {
    expect(
      resolveExcludedPackages({
        type: 'share',
        entry: './targets/share/index.tsx',
      })
    ).toEqual([...HOST_ONLY_EXCLUDED_PACKAGES]);
  });

  test('user extras are additive; host-only always present', () => {
    expect(
      resolveExcludedPackages({
        type: 'share',
        entry: './targets/share/index.tsx',
        excludedPackages: ['react-native-reanimated'],
      })
    ).toEqual([
      ...HOST_ONLY_EXCLUDED_PACKAGES,
      'react-native-reanimated',
    ]);
  });

  test('empty array still gets host-only packages', () => {
    expect(
      resolveExcludedPackages({
        type: 'messages',
        entry: './targets/messages/index.tsx',
        excludedPackages: [],
      })
    ).toEqual([...HOST_ONLY_EXCLUDED_PACKAGES]);
  });

  test('dedupes when user already lists host-only packages', () => {
    expect(
      resolveExcludedPackages({
        type: 'action',
        entry: './targets/action/index.tsx',
        excludedPackages: ['expo-updates', 'expo-font'],
      })
    ).toEqual(['expo-updates', 'expo-dev-client', 'expo-font']);
  });

  test('non-RN or no entry → no force-inject', () => {
    expect(
      resolveExcludedPackages({
        type: 'widget',
        excludedPackages: ['expo-updates'],
      })
    ).toEqual(['expo-updates']);

    expect(
      resolveExcludedPackages({
        type: 'share',
      })
    ).toBeUndefined();

    expect(
      resolveExcludedPackages({
        type: 'safari',
        entry: './targets/safari/popup.tsx',
      })
    ).toBeUndefined();
  });
});
