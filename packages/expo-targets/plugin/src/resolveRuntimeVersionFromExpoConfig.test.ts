import { describe, expect, test } from 'bun:test';

import { resolveRuntimeVersionFromExpoConfig } from './withTargetsDir';

describe('resolveRuntimeVersionFromExpoConfig', () => {
  test('reads top-level string runtimeVersion', () => {
    expect(
      resolveRuntimeVersionFromExpoConfig({ runtimeVersion: '1.0.0' })
    ).toBe('1.0.0');
  });

  test('falls back to updates.runtimeVersion', () => {
    expect(
      resolveRuntimeVersionFromExpoConfig({
        updates: { runtimeVersion: '2.0.0' },
      })
    ).toBe('2.0.0');
  });

  test('returns empty for policy objects / missing', () => {
    expect(
      resolveRuntimeVersionFromExpoConfig({
        runtimeVersion: { policy: 'appVersion' },
      })
    ).toBe('');
    expect(resolveRuntimeVersionFromExpoConfig({})).toBe('');
  });
});
