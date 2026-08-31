import { describe, expect, test } from 'bun:test';
import {
  anyTargetNeedsHostLiveActivities,
  ensureHostLiveActivities,
} from './ensureHostLiveActivities';
import { Logger } from './logger';

const logger = new Logger(false);

function hostInfoPlistMod(config: {
  mods?: { ios?: { infoPlist?: unknown } };
}) {
  return config.mods?.ios?.infoPlist;
}

function iosWidgetWithLiveActivity(attributesName: string) {
  return {
    config: {
      type: 'widget' as const,
      platforms: ['ios'],
      ios: { liveActivity: { attributesName } },
    },
  };
}

describe('anyTargetNeedsHostLiveActivities omit', () => {
  test('false when no target declares a Live Activity', () => {
    expect(
      anyTargetNeedsHostLiveActivities([
        { config: { type: 'widget', platforms: ['ios'] } },
      ])
    ).toBe(false);
  });

  test('false for android-only widget with liveActivity', () => {
    expect(
      anyTargetNeedsHostLiveActivities([
        {
          config: {
            type: 'widget',
            platforms: ['android'],
            ios: { liveActivity: { attributesName: 'OrderAttributes' } },
          },
        },
      ])
    ).toBe(false);
  });
});

describe('anyTargetNeedsHostLiveActivities detect', () => {
  test('true when ios.liveActivity has attributesName', () => {
    expect(
      anyTargetNeedsHostLiveActivities([
        iosWidgetWithLiveActivity('DynamicIslandAttributes'),
      ])
    ).toBe(true);
  });

  test('true when ios.liveActivities lists a row', () => {
    expect(
      anyTargetNeedsHostLiveActivities([
        {
          config: {
            type: 'widget',
            platforms: ['ios'],
            ios: {
              liveActivities: [{ attributesName: 'MeetingLiveAttributes' }],
            },
          },
        },
      ])
    ).toBe(true);
  });
});

describe('ensureHostLiveActivities omit', () => {
  test('does not stamp when no Live Activity is configured', () => {
    const config = ensureHostLiveActivities(
      { name: 'App', slug: 'app' },
      [{ config: { type: 'widget', platforms: ['ios'] } }],
      logger
    );

    expect(config.ios?.infoPlist?.NSSupportsLiveActivities).toBeUndefined();
    expect(hostInfoPlistMod(config)).toBeUndefined();
  });
});

describe('ensureHostLiveActivities stamp', () => {
  test('stamps host NSSupportsLiveActivities when ios.liveActivity is set', () => {
    const config = ensureHostLiveActivities(
      { name: 'App', slug: 'app' },
      [iosWidgetWithLiveActivity('DynamicIslandAttributes')],
      logger
    );

    expect(config.ios?.infoPlist?.NSSupportsLiveActivities).toBe(true);
    expect(typeof hostInfoPlistMod(config)).toBe('function');
  });

  test('stamps host NSSupportsLiveActivities when ios.liveActivities is set', () => {
    const config = ensureHostLiveActivities(
      {
        name: 'App',
        slug: 'app',
        ios: { infoPlist: { CFBundleDisplayName: 'App' } },
      },
      [
        {
          config: {
            type: 'widget',
            platforms: ['ios'],
            ios: {
              liveActivities: [{ attributesName: 'WeatherAttributes' }],
            },
          },
        },
      ],
      logger
    );

    expect(config.ios?.infoPlist?.CFBundleDisplayName).toBe('App');
    expect(config.ios?.infoPlist?.NSSupportsLiveActivities).toBe(true);
  });
});

describe('ensureHostLiveActivities force', () => {
  test('forces true when the host key is already false', () => {
    const config = ensureHostLiveActivities(
      {
        name: 'App',
        slug: 'app',
        ios: { infoPlist: { NSSupportsLiveActivities: false } },
      },
      [iosWidgetWithLiveActivity('OrderAttributes')],
      logger
    );

    expect(config.ios?.infoPlist?.NSSupportsLiveActivities).toBe(true);
  });
});
