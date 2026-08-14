import { describe, expect, test } from 'bun:test';
import {
  hasExplicitGalleryKinds,
  resolveGalleryWidgetKinds,
  resolveLiveActivityConfig,
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
          {
            type: 'live-activity',
            attributesName: 'DynamicIslandAttributes',
            contentState: { views: 'string' },
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
  test('reads attributes from a live-activity kind', () => {
    const la = resolveLiveActivityConfig({
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
    });
    expect(la?.attributesName).toBe('HelloExpoUiAttributes');
    expect(la?.pushType).toBe('token');
  });

  test('two live-activity kinds throw', () => {
    expect(() =>
      resolveLiveActivityConfig({
        ios: {
          kinds: [
            {
              type: 'live-activity',
              attributesName: 'A',
              contentState: { s: 'string' },
            },
            {
              type: 'live-activity',
              attributesName: 'B',
              contentState: { s: 'string' },
            },
          ],
        },
      })
    ).toThrow(/at most one/);
  });

  test('omitted kinds has no live activity', () => {
    expect(resolveLiveActivityConfig({ ios: {} })).toBeUndefined();
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
