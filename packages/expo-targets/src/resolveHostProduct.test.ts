import { describe, expect, test } from 'bun:test';
import type { TargetConfig } from '../plugin/src/config';
import {
  formatUnknownHostProductError,
  galleryProductNames,
  isMultiProductWidgetFolder,
  resolveHostProduct,
} from './resolveHostProduct';

const poplWidgets: TargetConfig = {
  type: 'widget',
  name: 'PoplWidgets',
  platforms: ['ios', 'android'],
  appGroup: 'group.test',
  ios: {
    kinds: [{ name: 'HomescreenWidgets' }, { name: 'LockScreenWidgets' }],
    liveActivity: {
      attributesName: 'DynamicIslandAttributes',
      contentState: { status: 'string' },
    },
  },
  android: {
    providers: [{ name: 'PoplHome' }, { name: 'PoplQR' }],
  },
};

const helloWidget: TargetConfig = {
  type: 'widget',
  name: 'HelloWidget',
  platforms: ['ios'],
  appGroup: 'group.hello',
};

describe('resolveHostProduct', () => {
  test('resolves folder name', () => {
    const resolved = resolveHostProduct('PoplWidgets', [poplWidgets]);
    expect(resolved).toEqual({
      config: poplWidgets,
      productName: 'PoplWidgets',
      role: 'folder',
    });
  });

  test('resolves ios.kinds name to parent config', () => {
    const resolved = resolveHostProduct('HomescreenWidgets', [poplWidgets]);
    expect(resolved?.config.name).toBe('PoplWidgets');
    expect(resolved?.productName).toBe('HomescreenWidgets');
    expect(resolved?.role).toBe('kind');
  });

  test('resolves android.providers name to parent config', () => {
    const resolved = resolveHostProduct('PoplQR', [poplWidgets]);
    expect(resolved?.config.name).toBe('PoplWidgets');
    expect(resolved?.productName).toBe('PoplQR');
    expect(resolved?.role).toBe('provider');
  });

  test('1:1 widget resolves folder as product', () => {
    const resolved = resolveHostProduct('HelloWidget', [helloWidget]);
    expect(resolved?.role).toBe('folder');
    expect(isMultiProductWidgetFolder(helloWidget)).toBe(false);
  });

  test('unknown name returns null', () => {
    expect(resolveHostProduct('Missing', [poplWidgets])).toBeNull();
  });

  test('formatUnknownHostProductError lists folders and kinds', () => {
    const message = formatUnknownHostProductError('Missing', [poplWidgets]);
    expect(message).toContain('PoplWidgets');
    expect(message).toContain('HomescreenWidgets');
  });
});

describe('isMultiProductWidgetFolder', () => {
  test('true for explicit multi-kind folder', () => {
    expect(isMultiProductWidgetFolder(poplWidgets)).toBe(true);
  });

  test('false for implicit 1:1 widget', () => {
    expect(isMultiProductWidgetFolder(helloWidget)).toBe(false);
  });

  test('false for single explicit kind matching folder name', () => {
    const single: TargetConfig = {
      ...helloWidget,
      ios: { kinds: [{ name: 'HelloWidget' }] },
    };
    expect(isMultiProductWidgetFolder(single)).toBe(false);
  });
});

describe('galleryProductNames', () => {
  test('returns ios.kinds when present', () => {
    expect(galleryProductNames(poplWidgets)).toEqual([
      'HomescreenWidgets',
      'LockScreenWidgets',
    ]);
  });

  test('returns folder name for 1:1', () => {
    expect(galleryProductNames(helloWidget)).toEqual(['HelloWidget']);
  });
});
