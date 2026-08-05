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
});
