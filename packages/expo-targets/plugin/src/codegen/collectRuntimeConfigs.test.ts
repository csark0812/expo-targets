import { describe, expect, test } from 'bun:test';

import { collectRuntimeConfigs } from './collectRuntimeConfigs';

describe('collectRuntimeConfigs', () => {
  test('includes companion intent-ui target names', () => {
    const configs = collectRuntimeConfigs(
      [
        {
          config: {
            name: 'MyIntent',
            type: 'intent',
            ios: { intents: { ui: { name: 'MyIntentUI' } } },
          },
        },
      ],
      {}
    );
    expect(configs.map((c) => c.name)).toEqual(['MyIntentUI', 'MyIntent']);
  });

  test('inherits host app group when target omits appGroup', () => {
    const configs = collectRuntimeConfigs(
      [{ config: { name: 'Share', type: 'share' } }],
      {
        ios: {
          entitlements: {
            'com.apple.security.application-groups': ['group.com.example.app'],
          },
        },
      }
    );
    expect(configs[0]?.appGroup).toBe('group.com.example.app');
  });

  test('copies ios.liveActivities onto the runtime row', () => {
    const configs = collectRuntimeConfigs(
      [
        {
          config: {
            name: 'PoplWidgets',
            type: 'widget',
            ios: {
              liveActivities: [
                {
                  attributesName: 'DynamicIslandAttributes',
                  contentState: { views: 'string' },
                },
                {
                  attributesName: 'MeetingLiveAttributes',
                  contentState: { status: 'string' },
                },
              ],
            },
          },
        },
      ],
      { ios: {} }
    );
    expect(configs[0]?.liveActivities?.map((la) => la.attributesName)).toEqual([
      'DynamicIslandAttributes',
      'MeetingLiveAttributes',
    ]);
    expect(configs[0]?.liveActivity?.attributesName).toBe(
      'DynamicIslandAttributes'
    );
  });

  test('copies ios.liveActivity onto the runtime row', () => {
    const configs = collectRuntimeConfigs(
      [
        {
          config: {
            name: 'WeatherWidget',
            type: 'widget',
            ios: {
              liveActivity: {
                attributesName: 'WeatherAttributes',
                contentState: { temp: 'double' },
              },
            },
          },
        },
      ],
      {}
    );
    expect(configs[0]?.liveActivity?.attributesName).toBe('WeatherAttributes');
  });
});
