import { describe, expect, test } from 'bun:test';
import { isIllegalUiMode, resolveUiMode } from './uiMode';

describe('resolveUiMode', () => {
  test('share + entry defaults to react-native', () => {
    expect(
      resolveUiMode({ type: 'share', entry: './targets/share/index.tsx' })
    ).toBe('react-native');
  });

  test('share + entry + ui expo-ui', () => {
    expect(
      resolveUiMode({
        type: 'share',
        entry: './x.tsx',
        ui: 'expo-ui',
      })
    ).toBe('expo-ui');
  });

  test('share without entry is native', () => {
    expect(resolveUiMode({ type: 'share' })).toBe('native');
  });

  test('widget + entry infers expo-ui', () => {
    expect(
      resolveUiMode({ type: 'widget', entry: './targets/w/index.tsx' })
    ).toBe('expo-ui');
  });

  test('widget without entry is native', () => {
    expect(resolveUiMode({ type: 'widget' })).toBe('native');
  });

  test('watch-widget + entry infers expo-ui', () => {
    expect(
      resolveUiMode({ type: 'watch-widget', entry: './w.tsx' })
    ).toBe('expo-ui');
  });
});

describe('isIllegalUiMode', () => {
  test('rejects react-native on widget', () => {
    expect(
      isIllegalUiMode({ type: 'widget', ui: 'react-native', entry: './x.tsx' })
    ).toMatch(/cannot use ui\/react-native/);
  });

  test('rejects expo-ui share without entry', () => {
    expect(isIllegalUiMode({ type: 'share', ui: 'expo-ui' })).toMatch(
      /requires an entry/
    );
  });

  test('allows share expo-ui with entry', () => {
    expect(
      isIllegalUiMode({ type: 'share', ui: 'expo-ui', entry: './x.tsx' })
    ).toBeNull();
  });

  test('allows widget entry (expo-ui)', () => {
    expect(
      isIllegalUiMode({ type: 'widget', entry: './x.tsx' })
    ).toBeNull();
  });
});
