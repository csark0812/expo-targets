// @ts-expect-error - bun:test types
import { describe, test, expect } from 'bun:test';
import { TargetTypeTester } from '../framework/TargetTypeTester.js';

type ExtensionType =
  | 'widget'
  | 'clip'
  | 'stickers'
  | 'share'
  | 'action'
  | 'safari'
  | 'notification-content'
  | 'notification-service'
  | 'intent'
  | 'intent-ui'
  | 'spotlight'
  | 'bg-download'
  | 'quicklook-thumbnail'
  | 'location-push'
  | 'credentials-provider'
  | 'account-auth'
  | 'app-intent'
  | 'device-activity-monitor'
  | 'matter'
  | 'watch';

const ALL_TARGET_TYPES: ExtensionType[] = [
  'widget',
  'clip',
  'stickers',
  'share',
  'action',
  'safari',
  'notification-content',
  'notification-service',
  'intent',
  'intent-ui',
  'spotlight',
  'bg-download',
  'quicklook-thumbnail',
  'location-push',
  'credentials-provider',
  'account-auth',
  'app-intent',
  'device-activity-monitor',
  'matter',
  'watch',
];

describe('All Target Types Validation', () => {
  const targetTypeTester = new TargetTypeTester();

  for (const type of ALL_TARGET_TYPES) {
    test(`${type}: Minimum deployment target defined`, () => {
      const minTarget = targetTypeTester.getMinimumDeploymentTarget(type);
      expect(minTarget).toBeTruthy();
      expect(minTarget).toBeString();
    });

    test(`${type}: Bundle identifier suffix defined`, () => {
      const suffix = targetTypeTester.getBundleIdentifierSuffix(type);
      expect(suffix).toBeTruthy();
      expect(suffix).toBeString();
    });
  }
});
