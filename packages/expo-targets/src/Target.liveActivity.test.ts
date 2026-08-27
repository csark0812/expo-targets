import {
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from 'bun:test';
import type { TargetConfig } from '../plugin/src/config';

const poplWidgets: TargetConfig = {
  type: 'widget',
  name: 'PoplWidgets',
  platforms: ['ios'],
  appGroup: 'group.test.popl',
  ios: {
    kinds: [{ name: 'HomescreenWidgets' }, { name: 'LockScreenWidgets' }],
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
};

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

const nativeStart = mock(async () => 'activity-id-1');
const nativeUpdate = mock(async () => true);
const nativeEnd = mock(async () => {});

mock.module('react-native', () => ({
  Platform: { OS: 'ios' },
  AppRegistry: { registerComponent: mock() },
}));

mock.module('expo-modules-core', () => ({
  requireNativeModule: () => ({
    start: nativeStart,
    update: nativeUpdate,
    end: nativeEnd,
    endAll: mock(async () => {}),
    endAllForAttributes: mock(async () => {}),
    areActivitiesEnabled: mock(async () => true),
  }),
}));

mock.module('./modules/targetsConfig', () => ({
  listTargets: () => [poplWidgets, trickWidget],
  findTargetsByType: mock(),
  resolveUniqueTarget: mock(),
  assertMatchesConfig: mock(),
}));

const { createTarget } = await import('./Target');

describe('createTarget().liveActivity()', () => {
  beforeEach(() => {
    nativeStart.mockClear();
    nativeUpdate.mockClear();
    nativeEnd.mockClear();
  });

  test('folder handle returns typed live activity without attributesName when one LA', async () => {
    const folder = createTarget('TrickWidget');
    expect(folder.type).toBe('widget');
    const handle = folder.liveActivity();
    expect(handle.attributesName).toBe('TrickActivityAttributes');
    const id = await handle.start({
      attributes: {},
      contentState: { status: 'active' },
    });
    expect(id).toBe('activity-id-1');
    expect(nativeStart).toHaveBeenCalledWith(
      'TrickActivityAttributes',
      '{}',
      JSON.stringify({ status: 'active' })
    );
  });

  test('multi-LA folder requires attributesName selector', () => {
    const folder = createTarget('PoplWidgets');
    expect(() => folder.liveActivity()).toThrow(/multiple Live Activities/i);
    const island = folder.liveActivity('DynamicIslandAttributes');
    expect(island.attributesName).toBe('DynamicIslandAttributes');
    const meeting = folder.liveActivity('MeetingLiveAttributes');
    expect(meeting.attributesName).toBe('MeetingLiveAttributes');
  });

  test('unknown live activity name on folder throws', () => {
    const folder = createTarget('PoplWidgets');
    expect(() => folder.liveActivity('MissingAttributes')).toThrow(
      /Unknown Live Activity "MissingAttributes"/
    );
  });

  test('handle update and end delegate to native module', async () => {
    const handle = createTarget('TrickWidget').liveActivity();
    const id = await handle.start({
      attributes: { title: 'Hi' },
      contentState: { status: 'go' },
    });
    await handle.update(id, { status: 'done' });
    await handle.end(id);
    expect(nativeUpdate).toHaveBeenCalledWith(
      id,
      JSON.stringify({ status: 'done' })
    );
    expect(nativeEnd).toHaveBeenCalledWith(id);
  });
});
