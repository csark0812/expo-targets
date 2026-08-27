import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { TargetConfig } from '../../../plugin/src/config';

const trickWidget: TargetConfig = {
  type: 'widget',
  name: 'TrickWidget',
  platforms: ['ios'],
  appGroup: 'group.test.trick',
  ios: {
    liveActivity: {
      attributesName: 'TrickActivityAttributes',
      contentState: { status: 'string' },
    },
  },
};

const nativeStart = mock(async () => 'act-99');
const nativeEndAll = mock(async () => {});
const nativeEndAllForAttributes = mock(async () => {});

mock.module('react-native', () => ({
  Platform: { OS: 'ios' },
}));

mock.module('expo-modules-core', () => ({
  requireNativeModule: () => ({
    start: nativeStart,
    update: mock(async () => true),
    end: mock(async () => {}),
    endAll: nativeEndAll,
    endAllForAttributes: nativeEndAllForAttributes,
    areActivitiesEnabled: mock(async () => true),
  }),
}));

mock.module('../targetsConfig', () => ({
  listTargets: () => [trickWidget],
}));

mock.module('../../liveActivityLayout', () => ({
  getExpoUiLiveActivityByAttributes: mock(),
  getExpoUiLiveActivityInstance: mock(),
  registerExpoUiLiveActivityAttributes: mock(),
}));

const {
  buildLiveActivityHandle,
  createLiveActivity,
  endAllLiveActivities,
  LiveActivity,
} = await import('./index');

describe('liveActivity module start', () => {
  beforeEach(() => {
    nativeStart.mockClear();
    nativeEndAll.mockClear();
    nativeEndAllForAttributes.mockClear();
  });

  test('buildLiveActivityHandle starts via native bridge', async () => {
    const handle = buildLiveActivityHandle('TrickActivityAttributes');
    const id = await handle.start({
      attributes: { title: 'Trick' },
      contentState: { status: 'live' },
    });
    expect(id).toBe('act-99');
    expect(handle.attributesName).toBe('TrickActivityAttributes');
  });

  test('deprecated createLiveActivity matches buildLiveActivityHandle', async () => {
    const handle = createLiveActivity('TrickActivityAttributes');
    await handle.start({
      attributes: {},
      contentState: { status: 'x' },
    });
    expect(nativeStart).toHaveBeenCalled();
    expect(nativeEndAllForAttributes).toHaveBeenCalledWith(
      'TrickActivityAttributes'
    );
  });

  test('start default replaceExisting ends that attributesName only', async () => {
    const handle = buildLiveActivityHandle('TrickActivityAttributes');
    await handle.start({
      attributes: {},
      contentState: { status: 'x' },
    });
    expect(nativeEndAllForAttributes).toHaveBeenCalledWith(
      'TrickActivityAttributes'
    );
    expect(nativeEndAll).not.toHaveBeenCalled();
    expect(nativeStart).toHaveBeenCalled();
  });

  test('start replaceExisting false skips end', async () => {
    const handle = buildLiveActivityHandle('TrickActivityAttributes');
    await handle.start({
      attributes: {},
      contentState: { status: 'x' },
      replaceExisting: false,
    });
    expect(nativeEndAllForAttributes).not.toHaveBeenCalled();
    expect(nativeStart).toHaveBeenCalled();
  });
});

describe('liveActivity module endAll', () => {
  beforeEach(() => {
    nativeStart.mockClear();
    nativeEndAll.mockClear();
    nativeEndAllForAttributes.mockClear();
  });

  test('LiveActivity.endAll delegates to native module', async () => {
    await endAllLiveActivities();
    expect(nativeEndAll).toHaveBeenCalled();
    await LiveActivity.endAll();
    expect(nativeEndAll).toHaveBeenCalledTimes(2);
  });

  test('unknown attributesName throws with folder.liveActivity hint', () => {
    expect(() => buildLiveActivityHandle('MissingAttributes')).toThrow(
      /createTarget\('Folder'\)\.liveActivity/
    );
  });
});
