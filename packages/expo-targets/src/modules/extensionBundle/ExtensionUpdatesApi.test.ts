import { describe, expect, test } from 'bun:test';

import { shouldAutoEnableExtensionUpdates } from './ExtensionUpdatesApi';

describe('shouldAutoEnableExtensionUpdates', () => {
  test('false in appex even when ExtensionBundle is present', () => {
    expect(
      shouldAutoEnableExtensionUpdates({
        isAppExtension: true,
        hasExpoUpdates: false,
        hasExtensionBundle: true,
      })
    ).toBe(false);
  });

  test('false on host without ExpoUpdates', () => {
    expect(
      shouldAutoEnableExtensionUpdates({
        isAppExtension: false,
        hasExpoUpdates: false,
        hasExtensionBundle: true,
      })
    ).toBe(false);
  });

  test('false without ExtensionBundle install module', () => {
    expect(
      shouldAutoEnableExtensionUpdates({
        isAppExtension: false,
        hasExpoUpdates: true,
        hasExtensionBundle: false,
      })
    ).toBe(false);
  });

  test('true on host with Updates + ExtensionBundle', () => {
    expect(
      shouldAutoEnableExtensionUpdates({
        isAppExtension: false,
        hasExpoUpdates: true,
        hasExtensionBundle: true,
      })
    ).toBe(true);
  });
});
