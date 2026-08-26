import { describe, expect, test } from 'bun:test';
import {
  hasExplicitGalleryKinds,
  resolveGalleryWidgetKinds,
  resolveLiveActivityConfig,
  resolveLiveActivityConfigs,
} from './resolveIosKinds';

describe('resolveGalleryWidgetKinds 1:1', () => {
  test('omitted kinds uses the target name as one widget', () => {
    const [kind] = resolveGalleryWidgetKinds({
      targetName: 'HelloExpoUi',
      displayName: 'Hello Expo UI',
      ios: { supportedFamilies: ['systemSmall'] },
    });
    expect(kind.name).toBe('HelloExpoUi');
    expect(kind.displayName).toBe('Hello Expo UI');
    expect(kind.supportedFamilies).toEqual(['systemSmall']);
  });
});

describe('resolveGalleryWidgetKinds list', () => {
  test('kinds is the full gallery list', () => {
    const kinds = resolveGalleryWidgetKinds({
      targetName: 'HomescreenWidgets',
      ios: {
        kinds: [
          {
            name: 'HomescreenWidgets',
            supportedFamilies: ['systemSmall', 'systemMedium', 'systemLarge'],
          },
          {
            name: 'LockScreenWidgets',
            displayName: 'Lock QR',
            supportedFamilies: ['accessoryCircular', 'accessoryRectangular'],
          },
        ],
      },
    });
    expect(kinds.map((k) => k.name)).toEqual([
      'HomescreenWidgets',
      'LockScreenWidgets',
    ]);
    expect(kinds[1]?.displayName).toBe('Lock QR');
  });

  test('a live-activity kinds row throws', () => {
    expect(() =>
      resolveGalleryWidgetKinds({
        targetName: 'HomescreenWidgets',
        ios: {
          kinds: [
            { name: 'Home' },
            {
              type: 'live-activity',
              attributesName: 'DynamicIslandAttributes',
              contentState: { views: 'string' },
            },
          ],
        },
      })
    ).toThrow(/ios\.liveActivity/);
  });

  test('duplicate widget names throw', () => {
    expect(() =>
      resolveGalleryWidgetKinds({
        targetName: 'W',
        ios: { kinds: [{ name: 'A' }, { name: 'A' }] },
      })
    ).toThrow(/A/);
  });
});

describe('resolveLiveActivityConfig', () => {
  test('reads ios.liveActivity', () => {
    const la = resolveLiveActivityConfig({
      ios: {
        kinds: [{ name: 'Home' }],
        liveActivity: {
          attributesName: 'HelloExpoUiAttributes',
          static: { title: 'string' },
          contentState: { status: 'string' },
          pushType: 'token',
        },
      },
    });
    expect(la?.attributesName).toBe('HelloExpoUiAttributes');
    expect(la?.pushType).toBe('token');
  });

  test('a live-activity kinds row throws even when ios.liveActivity is set', () => {
    expect(() =>
      resolveLiveActivityConfig({
        ios: {
          liveActivity: {
            attributesName: 'SiblingAttributes',
            contentState: { status: 'string' },
          },
          kinds: [
            {
              type: 'live-activity',
              attributesName: 'KindAttributes',
              contentState: { status: 'string' },
            },
          ],
        },
      })
    ).toThrow(/ios\.liveActivity/);
  });

  test('a leftover live-activity kind throws', () => {
    expect(() =>
      resolveLiveActivityConfig({
        ios: {
          kinds: [
            { name: 'Home' },
            {
              type: 'live-activity',
              attributesName: 'HelloExpoUiAttributes',
              static: { title: 'string' },
              contentState: { status: 'string' },
              pushType: 'token',
            },
          ],
        },
      })
    ).toThrow(/ios\.liveActivity/);
  });

  test('omitted liveActivity and kinds has no live activity', () => {
    expect(resolveLiveActivityConfig({ ios: {} })).toBeUndefined();
  });

  test('reads ios.liveActivities array', () => {
    const configs = resolveLiveActivityConfigs({
      ios: {
        liveActivities: [
          {
            attributesName: 'DynamicIslandAttributes',
            contentState: { views: 'string' },
          },
          {
            attributesName: 'MeetingLiveAttributes',
            static: { meetingId: 'string' },
            contentState: { status: 'string' },
          },
        ],
      },
    });
    expect(configs.map((la) => la.attributesName)).toEqual([
      'DynamicIslandAttributes',
      'MeetingLiveAttributes',
    ]);
    expect(resolveLiveActivityConfig({ ios: { liveActivities: configs } })?.attributesName).toBe(
      'DynamicIslandAttributes'
    );
  });

  test('singular and array together throw', () => {
    expect(() =>
      resolveLiveActivityConfigs({
        ios: {
          liveActivity: {
            attributesName: 'A',
            contentState: { s: 'string' },
          },
          liveActivities: [
            {
              attributesName: 'B',
              contentState: { s: 'string' },
            },
          ],
        },
      })
    ).toThrow(/OR ios\.liveActivity/);
  });

  test('duplicate attributesName in liveActivities throws', () => {
    expect(() =>
      resolveLiveActivityConfigs({
        ios: {
          liveActivities: [
            {
              attributesName: 'SameAttributes',
              contentState: { a: 'string' },
            },
            {
              attributesName: 'SameAttributes',
              contentState: { b: 'string' },
            },
          ],
        },
      })
    ).toThrow(/Duplicate Live Activity/);
  });
});

describe('hasExplicitGalleryKinds', () => {
  test('true when a widget kind is listed', () => {
    expect(hasExplicitGalleryKinds({ kinds: [{ name: 'Home' }] })).toBe(true);
  });

  test('false for live-activity-only kinds', () => {
    expect(
      hasExplicitGalleryKinds({
        kinds: [
          {
            type: 'live-activity',
            attributesName: 'A',
            contentState: { s: 'string' },
          },
        ],
      })
    ).toBe(false);
  });
});
