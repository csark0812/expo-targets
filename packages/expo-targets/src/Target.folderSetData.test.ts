import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { TargetConfig } from '../plugin/src/config';

const setDataCalls: { name?: string; data: Record<string, unknown> }[] = [];
const refreshCalls: string[] = [];

const poplWidgets: TargetConfig = {
  type: 'widget',
  name: 'PoplWidgets',
  platforms: ['ios'],
  appGroup: 'group.test.popl',
  ios: {
    kinds: [
      { name: 'HomescreenWidgets' },
      { name: 'LockScreenWidgets' },
      { name: 'LockScreenScanWidget' },
    ],
  },
};

mock.module('react-native', () => ({
  Platform: { OS: 'ios' },
  AppRegistry: { registerComponent: mock() },
}));

mock.module('expo-modules-core', () => ({
  requireNativeModule: () => ({
    setInt: mock(),
    setString: mock(),
    remove: mock(),
    get: mock(),
    getAllData: mock(() => ({})),
    getAllKeys: mock(() => []),
    clearAll: mock(),
    refreshTarget: mock(),
    getTargetsConfig: mock(() => [poplWidgets]),
  }),
}));

mock.module('./modules/storage/index', () => ({
  AppGroupStorage: class {
    constructor(
      _appGroup: string,
      private readonly targetName?: string
    ) {}
    setData(data: Record<string, unknown>) {
      setDataCalls.push({ name: this.targetName, data });
    }
    getData() {
      return {};
    }
    refresh(name?: string) {
      refreshCalls.push(name ?? this.targetName ?? '');
    }
  },
}));

mock.module('./modules/targetsConfig', () => ({
  listTargets: () => [poplWidgets],
  findTargetsByType: mock(),
  resolveUniqueTarget: mock(),
  assertMatchesConfig: mock(),
}));

const { createTarget } = await import('./Target');

describe('widget folder setData', () => {
  beforeEach(() => {
    setDataCalls.length = 0;
    refreshCalls.length = 0;
  });

  test('writes the same payload to every kind', () => {
    const folder = createTarget('PoplWidgets');
    folder.setData({ shareUrl: 'https://popl.co' });
    expect(setDataCalls.map((c) => c.name).sort()).toEqual([
      'HomescreenWidgets',
      'LockScreenScanWidget',
      'LockScreenWidgets',
    ]);
    expect(
      setDataCalls.every((c) => c.data.shareUrl === 'https://popl.co')
    ).toBe(true);
    expect(refreshCalls.sort()).toEqual([
      'HomescreenWidgets',
      'LockScreenScanWidget',
      'LockScreenWidgets',
    ]);
  });

  test('refresh false skips reload', () => {
    const folder = createTarget('PoplWidgets');
    folder.setData({ shareUrl: 'https://popl.co' }, { refresh: false });
    expect(setDataCalls).toHaveLength(3);
    expect(refreshCalls).toEqual([]);
  });
});
