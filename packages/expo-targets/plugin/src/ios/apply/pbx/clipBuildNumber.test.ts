import { describe, expect, test } from 'bun:test';
import type { XcodeProject } from '@expo/config-plugins';

import { removeClipBuildNumberPhase } from './clipBuildNumber';

function projectWithPhases(names: string[]): {
  project: XcodeProject;
  objects: any;
} {
  const PBXShellScriptBuildPhase: Record<string, any> = {};
  const buildPhases = names.map((name, index) => {
    const uuid = `PHASE${index}`;
    PBXShellScriptBuildPhase[uuid] = { isa: 'PBXShellScriptBuildPhase', name };
    PBXShellScriptBuildPhase[`${uuid}_comment`] = name;
    return { value: uuid, comment: name };
  });
  const objects = {
    PBXNativeTarget: { CLIP: { buildPhases } },
    PBXShellScriptBuildPhase,
  };
  return { project: { hash: { project: { objects } } } as any, objects };
}

describe('removeClipBuildNumberPhase', () => {
  test('drops the retired Sync App Clip CFBundleVersion phase', () => {
    const { project, objects } = projectWithPhases([
      '"[CP] Check Pods Manifest.lock"',
      '"[expo-targets] Sync App Clip CFBundleVersion"',
    ]);

    removeClipBuildNumberPhase({ project, clipTargetUuid: 'CLIP' });

    expect(
      objects.PBXNativeTarget.CLIP.buildPhases.map((p: any) => p.value)
    ).toEqual(['PHASE0']);
    expect(objects.PBXShellScriptBuildPhase.PHASE1).toBeUndefined();
    expect(objects.PBXShellScriptBuildPhase.PHASE1_comment).toBeUndefined();
    expect(objects.PBXShellScriptBuildPhase.PHASE0).toBeDefined();
  });

  test('is a no-op when the phase is absent', () => {
    const { project, objects } = projectWithPhases(['"Bundle React Native"']);

    removeClipBuildNumberPhase({ project, clipTargetUuid: 'CLIP' });

    expect(objects.PBXNativeTarget.CLIP.buildPhases).toHaveLength(1);
  });
});
