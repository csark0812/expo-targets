import { describe, expect, test } from 'bun:test';
import { TYPE_MINIMUM_DEPLOYMENT_TARGETS } from '../config';
import {
  REQUIRES_APP_GROUP_TYPES,
  resolveApplicationGroups,
  shouldUseAppGroups,
} from './appGroups';
import { TYPE_BUNDLE_IDENTIFIER_SUFFIXES } from './bundleIds';
import {
  EXTENSION_POINT_IDENTIFIERS,
  EXTENSION_TYPES,
  SHOULD_USE_APP_GROUPS_BY_DEFAULT,
  TYPE_CHARACTERISTICS,
} from './characteristics';
import {
  isReactNativeCompatible,
  isReactNativeNative,
  isReactNativeWeb,
  REACT_NATIVE_COMPATIBLE_TYPES,
  REACT_NATIVE_NATIVE_TYPES,
  REACT_NATIVE_WEB_TYPES,
} from './rnCompat';
import type { ExtensionType } from './types';

function sorted(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function typesWithFlag(
  flag: 'isReactNativeNative' | 'isReactNativeWeb' | 'needsIsolatedSearchPaths'
): ExtensionType[] {
  return EXTENSION_TYPES.filter((type) => TYPE_CHARACTERISTICS[type][flag]);
}

describe('TYPE_CHARACTERISTICS config maps', () => {
  test('declares an entry for every ExtensionType', () => {
    expect(sorted(EXTENSION_TYPES)).toEqual(
      sorted(Object.keys(TYPE_MINIMUM_DEPLOYMENT_TARGETS))
    );
    expect(sorted(EXTENSION_TYPES)).toEqual(
      sorted(Object.keys(TYPE_BUNDLE_IDENTIFIER_SUFFIXES))
    );
  });
});

test.each(EXTENSION_TYPES)('%s core fields', (type) => {
  const characteristics = TYPE_CHARACTERISTICS[type];
  expect(typeof characteristics.requiresCode).toBe('boolean');
  expect(typeof characteristics.requiresEntitlements).toBe('boolean');
  expect(typeof characteristics.defaultUsesAppGroups).toBe('boolean');
  expect(typeof characteristics.supportsActivationRules).toBe('boolean');
  expect(typeof characteristics.productType).toBe('string');
  expect(typeof characteristics.extensionPointIdentifier).toBe('string');
  expect(Array.isArray(characteristics.frameworks)).toBe(true);
  expect(['application', 'app_extension']).toContain(
    characteristics.targetType
  );
});

test.each(EXTENSION_TYPES)('%s embed + activation fields', (type) => {
  const characteristics = TYPE_CHARACTERISTICS[type];
  expect([
    'foundation-extension',
    'extensionkit-extension',
    'app-clip',
    'watch-content',
    'watch-extension',
    'none',
  ]).toContain(characteristics.embedType);
  expect(['direct', 'attributes', 'none']).toContain(
    characteristics.activationRulesLocation
  );
  expect(typeof characteristics.isReactNativeNative).toBe('boolean');
  expect(typeof characteristics.isReactNativeWeb).toBe('boolean');
  expect(typeof characteristics.needsIsolatedSearchPaths).toBe('boolean');
});

test.each(EXTENSION_TYPES)('%s android ledger fields', (type) => {
  const characteristics = TYPE_CHARACTERISTICS[type];
  expect(['dual', 'native-only', 'rn-only']).toContain(
    characteristics.rnExample
  );
  expect([
    'none',
    'widget',
    'activity',
    'service',
    'provider',
    'ime',
    'vpn',
    'wear',
  ]).toContain(characteristics.androidComponent);
  expect(['strong', 'partial', 'apple-only']).toContain(
    characteristics.androidBucket
  );
  if (characteristics.androidBucket === 'partial') {
    expect(typeof characteristics.androidPartial).toBe('string');
  }
});

test('Android API-ceiling ledger counts', () => {
  const strong = EXTENSION_TYPES.filter(
    (t) => TYPE_CHARACTERISTICS[t].androidBucket === 'strong'
  );
  const partial = EXTENSION_TYPES.filter(
    (t) => TYPE_CHARACTERISTICS[t].androidBucket === 'partial'
  );
  expect(strong).toHaveLength(12);
  expect(partial.length).toBeGreaterThanOrEqual(8);
  expect(TYPE_CHARACTERISTICS.share.androidComponent).toBe('activity');
  expect(TYPE_CHARACTERISTICS.widget.androidComponent).toBe('widget');
  expect(TYPE_CHARACTERISTICS.clip.androidBucket).toBe('apple-only');
});

describe('TYPE_CHARACTERISTICS lookup maps', () => {
  test('derived lookup maps mirror the characteristics map', () => {
    for (const type of EXTENSION_TYPES) {
      expect(EXTENSION_POINT_IDENTIFIERS[type]).toBe(
        TYPE_CHARACTERISTICS[type].extensionPointIdentifier
      );
      expect(SHOULD_USE_APP_GROUPS_BY_DEFAULT[type]).toBe(
        TYPE_CHARACTERISTICS[type].defaultUsesAppGroups
      );
    }
  });
});

describe('rnExample', () => {
  test('dual covers UI extension points', () => {
    const dual = EXTENSION_TYPES.filter(
      (t) => TYPE_CHARACTERISTICS[t].rnExample === 'dual'
    );
    expect(sorted(dual)).toEqual(
      sorted([
        'action',
        'clip',
        'messages',
        'notification-content',
        'safari',
        'share',
      ])
    );
  });
});

describe('flag matrix', () => {
  test('isReactNativeNative covers share, action, clip, messages, notification-content', () => {
    expect(sorted(typesWithFlag('isReactNativeNative'))).toEqual([
      'action',
      'clip',
      'messages',
      'notification-content',
      'share',
    ]);
  });

  test('isReactNativeWeb covers safari only', () => {
    expect(typesWithFlag('isReactNativeWeb')).toEqual(['safari']);
  });

  test('needsIsolatedSearchPaths covers clip, watch, and watch-widget', () => {
    expect(sorted(typesWithFlag('needsIsolatedSearchPaths'))).toEqual([
      'clip',
      'watch',
      'watch-widget',
    ]);
  });

  test('no type is both React Native native and React Native web', () => {
    for (const type of EXTENSION_TYPES) {
      const { isReactNativeNative: native, isReactNativeWeb: web } =
        TYPE_CHARACTERISTICS[type];
      expect(native && web).toBe(false);
    }
  });
});

describe('rnCompat', () => {
  test('exported arrays stay in sync with the characteristics flags', () => {
    expect(sorted(REACT_NATIVE_NATIVE_TYPES)).toEqual(
      sorted(typesWithFlag('isReactNativeNative'))
    );
    expect(sorted(REACT_NATIVE_WEB_TYPES)).toEqual(
      sorted(typesWithFlag('isReactNativeWeb'))
    );
    expect(sorted(REACT_NATIVE_COMPATIBLE_TYPES)).toEqual(
      sorted([
        ...typesWithFlag('isReactNativeNative'),
        ...typesWithFlag('isReactNativeWeb'),
      ])
    );
  });

  test('predicates classify each type exactly once', () => {
    expect(isReactNativeNative('share')).toBe(true);
    expect(isReactNativeWeb('share')).toBe(false);
    expect(isReactNativeNative('safari')).toBe(false);
    expect(isReactNativeWeb('safari')).toBe(true);
    expect(isReactNativeCompatible('safari')).toBe(true);
    expect(isReactNativeCompatible('widget')).toBe(false);
  });
});

describe('appGroups', () => {
  test('shouldUseAppGroups matches defaultUsesAppGroups for every type', () => {
    for (const type of EXTENSION_TYPES) {
      expect(shouldUseAppGroups(type)).toBe(
        TYPE_CHARACTERISTICS[type].defaultUsesAppGroups
      );
    }
  });

  test('required App Group types all default to App Groups', () => {
    for (const type of REQUIRES_APP_GROUP_TYPES) {
      expect(shouldUseAppGroups(type)).toBe(true);
    }
    expect(sorted(REQUIRES_APP_GROUP_TYPES)).toEqual([
      'bg-download',
      'share',
      'widget',
    ]);
    expect(shouldUseAppGroups('clip')).toBe(false);
  });
});

describe('resolveApplicationGroups', () => {
  test('omits empty lists and inherits only when asked', () => {
    expect(
      resolveApplicationGroups({
        configured: [],
        mainAppGroups: ['group.host'],
        inheritHost: true,
      })
    ).toBeUndefined();
    expect(
      resolveApplicationGroups({
        configured: undefined,
        mainAppGroups: ['group.host'],
        inheritHost: false,
      })
    ).toBeUndefined();
    expect(
      resolveApplicationGroups({
        configured: undefined,
        appGroup: 'group.clip',
        mainAppGroups: ['group.host'],
        inheritHost: false,
      })
    ).toEqual(['group.clip']);
    expect(
      resolveApplicationGroups({
        configured: ['group.explicit'],
        appGroup: 'group.clip',
        mainAppGroups: ['group.host'],
        inheritHost: true,
      })
    ).toEqual(['group.explicit']);
  });
});
