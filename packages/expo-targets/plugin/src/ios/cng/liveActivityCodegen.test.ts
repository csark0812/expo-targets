import { describe, expect, test } from 'bun:test';

import {
  generateLiveActivityAttributesSwift,
  generateLiveActivityBridgeSwift,
} from './liveActivityCodegen';

describe('liveActivityCodegen multi-target rows', () => {
  test('generates distinct attribute structs and bridge registrars per name', () => {
    const configs = [
      {
        attributesName: 'DynamicIslandAttributes',
        contentState: { views: 'string' as const },
      },
      {
        attributesName: 'MeetingLiveAttributes',
        static: { meetingId: 'string' as const },
        contentState: { status: 'string' as const },
      },
    ];

    const files = configs.map((config) => ({
      attributes: generateLiveActivityAttributesSwift(config),
      bridge: generateLiveActivityBridgeSwift(config),
    }));

    expect(files[0]?.attributes).toContain('struct DynamicIslandAttributes');
    expect(files[1]?.attributes).toContain('struct MeetingLiveAttributes');
    expect(files[0]?.bridge).toContain('expo_targets_la_bootstrap_DynamicIslandAttributes');
    expect(files[1]?.bridge).toContain('expo_targets_la_bootstrap_MeetingLiveAttributes');
    expect(files[0]?.bridge).not.toContain('MeetingLiveAttributes');
  });
});
