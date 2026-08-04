import { describe, expect, test } from 'bun:test';
import * as path from 'node:path';

import { findNativeTargetByProductName } from '../../../../test-utils/assertPbx';
import { loadPbx } from '../../../../test-utils/loadPbx';
import { applyBuildSettings } from './buildSettings';
import {
  configureAppClipEmbed,
  configureAppExtensionEmbed,
  configureExtensionKitEmbed,
  configureWatchAppExtensionEmbed,
  configureWatchContentEmbed,
  removeAppExtensionFromHostEmbed,
} from './embed';
import { findWatchCompanionTargetUuid } from './targetLifecycle';

const fixturePath = path.join(
  __dirname,
  '../../../../__fixtures__/pbx/minimal-app/project.pbxproj'
);

function copyFilesPhases(project: any): Record<string, any> {
  return project.hash.project.objects.PBXCopyFilesBuildPhase || {};
}

function phasesNamed(project: any, name: string): string[] {
  const phases = copyFilesPhases(project);
  return Object.keys(phases).filter(
    (key) => !key.endsWith('_comment') && phases[key]?.name === `"${name}"`
  );
}

function addNativeTarget(
  project: any,
  { productName, type }: { productName: string; type: string }
): any {
  return project.addTarget(
    productName,
    type,
    productName,
    `com.example.app.${productName.toLowerCase()}`
  );
}

describe('configureAppExtensionEmbed', () => {
  test('consolidates extension embedding into a single phase when applied twice', () => {
    const project = loadPbx(fixturePath);
    const mainTarget = findNativeTargetByProductName(project, 'App')!;
    const extension = addNativeTarget(project, {
      productName: 'ShareMinimalTarget',
      type: 'app_extension',
    });

    // The extension product must be embedded by the host app; `addTarget`
    // already created the .appex product reference we look for.
    project.addBuildPhase(
      [extension.pbxNativeTarget?.productReference || extension.uuid],
      'PBXCopyFilesBuildPhase',
      'Embed Foundation Extensions',
      mainTarget.uuid,
      'frameworks'
    );

    configureAppExtensionEmbed({
      project,
      targetProductName: 'ShareMinimalTarget',
    });
    const afterFirst = phasesNamed(project, 'Embed App Extensions').length;

    configureAppExtensionEmbed({
      project,
      targetProductName: 'ShareMinimalTarget',
    });
    const afterSecond = phasesNamed(project, 'Embed App Extensions').length;

    expect(afterSecond).toBe(afterFirst);
    expect(afterSecond).toBeLessThanOrEqual(1);
  });
});

const CLIP_PRODUCT = 'ClipMinimalTarget';

function setupClipProject(): {
  project: any;
  mainTargetUuid: string;
  clip: any;
} {
  const project = loadPbx(fixturePath);
  const mainTarget = findNativeTargetByProductName(project, 'App')!;
  const clip = addNativeTarget(project, {
    productName: CLIP_PRODUCT,
    type: 'application',
  });
  return { project, mainTargetUuid: mainTarget.uuid, clip };
}

function embedClip(project: any, mainTargetUuid: string, target: any): void {
  configureAppClipEmbed({
    project,
    mainTargetUuid,
    target,
    targetProductName: CLIP_PRODUCT,
  });
}

describe('configureAppClipEmbed', () => {
  /**
   * Fix-as-found (iOS pipeline modularization, phase 3): `configureAppClipEmbed`
   * used to call `addBuildPhase` unconditionally, so every prebuild appended
   * another "Embed App Clips" phase and another build file for the same clip.
   * It now reuses the existing phase, matching the extension embed behaviour.
   */
  test('reuses the existing Embed App Clips phase when applied twice', () => {
    const { project, mainTargetUuid, clip } = setupClipProject();

    embedClip(project, mainTargetUuid, clip);
    const phaseKeys = phasesNamed(project, 'Embed App Clips');
    expect(phaseKeys).toHaveLength(1);
    expect(copyFilesPhases(project)[phaseKeys[0]].files).toHaveLength(1);

    embedClip(project, mainTargetUuid, clip);
    const phaseKeysAfter = phasesNamed(project, 'Embed App Clips');
    expect(phaseKeysAfter).toEqual(phaseKeys);
    expect(copyFilesPhases(project)[phaseKeysAfter[0]].files).toHaveLength(1);
  });
});

describe('configureExtensionKitEmbed', () => {
  test('embeds into Extensions/ and is idempotent', () => {
    const project = loadPbx(fixturePath);
    const mainTarget = findNativeTargetByProductName(project, 'App')!;
    const extension = addNativeTarget(project, {
      productName: 'AppIntentMinimalTarget',
      type: 'app_extension',
    });

    configureExtensionKitEmbed({
      project,
      mainTargetUuid: mainTarget.uuid,
      target: extension,
      targetProductName: 'AppIntentMinimalTarget',
    });
    const phaseKeys = phasesNamed(project, 'Embed ExtensionKit Extensions');
    expect(phaseKeys).toHaveLength(1);
    const phase = copyFilesPhases(project)[phaseKeys[0]!];
    expect(phase.dstPath).toBe('"$(EXTENSIONS_FOLDER_PATH)"');
    expect(phase.dstSubfolderSpec).toBe(16);
    expect(phase.files).toHaveLength(1);

    configureExtensionKitEmbed({
      project,
      mainTargetUuid: mainTarget.uuid,
      target: extension,
      targetProductName: 'AppIntentMinimalTarget',
    });
    expect(phasesNamed(project, 'Embed ExtensionKit Extensions')).toEqual(
      phaseKeys,
    );
    expect(copyFilesPhases(project)[phaseKeys[0]!].files).toHaveLength(1);
  });
});

describe('configureAppClipEmbed phase shape', () => {
  test('configures the phase for the AppClips destination', () => {
    const { project, mainTargetUuid, clip } = setupClipProject();

    embedClip(project, mainTargetUuid, clip);

    const [phaseKey] = phasesNamed(project, 'Embed App Clips');
    const phase = copyFilesPhases(project)[phaseKey];
    expect(phase.dstPath).toBe('"$(CONTENTS_FOLDER_PATH)/AppClips"');
    expect(phase.dstSubfolderSpec).toBe(16);
  });

  test('is a no-op when the target has no product reference', () => {
    const project = loadPbx(fixturePath);
    const mainTarget = findNativeTargetByProductName(project, 'App')!;

    embedClip(project, mainTarget.uuid, { uuid: 'missing' });

    expect(phasesNamed(project, 'Embed App Clips')).toHaveLength(0);
  });
});

const WATCH_PRODUCT = 'WatchMinimalTarget';

function setupWatchProject(): {
  project: any;
  mainTargetUuid: string;
  watch: any;
} {
  const project = loadPbx(fixturePath);
  const mainTarget = findNativeTargetByProductName(project, 'App')!;
  const watch = addNativeTarget(project, {
    productName: WATCH_PRODUCT,
    type: 'application',
  });
  return { project, mainTargetUuid: mainTarget.uuid, watch };
}

function embedWatch(project: any, mainTargetUuid: string, target: any): void {
  configureWatchContentEmbed({
    project,
    mainTargetUuid,
    target,
    targetProductName: WATCH_PRODUCT,
  });
}

describe('configureWatchContentEmbed', () => {
  test('reuses the existing Embed Watch Content phase when applied twice', () => {
    const { project, mainTargetUuid, watch } = setupWatchProject();

    embedWatch(project, mainTargetUuid, watch);
    const phaseKeys = phasesNamed(project, 'Embed Watch Content');
    expect(phaseKeys).toHaveLength(1);
    expect(copyFilesPhases(project)[phaseKeys[0]].files).toHaveLength(1);

    embedWatch(project, mainTargetUuid, watch);
    const phaseKeysAfter = phasesNamed(project, 'Embed Watch Content');
    expect(phaseKeysAfter).toEqual(phaseKeys);
    expect(copyFilesPhases(project)[phaseKeysAfter[0]].files).toHaveLength(1);
  });

  test('configures the phase for the Watch destination', () => {
    const { project, mainTargetUuid, watch } = setupWatchProject();

    embedWatch(project, mainTargetUuid, watch);

    const [phaseKey] = phasesNamed(project, 'Embed Watch Content');
    const phase = copyFilesPhases(project)[phaseKey];
    expect(phase.dstPath).toBe('"$(CONTENTS_FOLDER_PATH)/Watch"');
    expect(phase.dstSubfolderSpec).toBe(16);
  });
});

const WATCH_WIDGET_PRODUCT = 'WatchWidgetTarget';

function embedPhasesOnTarget(
  project: any,
  targetUuid: string,
  phaseName: string
): { phaseKey: string; phase: any }[] {
  const target = project.hash.project.objects.PBXNativeTarget[targetUuid];
  const copyPhases = copyFilesPhases(project);
  return (target.buildPhases || [])
    .filter(
      (entry: { value: string }) =>
        copyPhases[entry.value]?.name === `"${phaseName}"`
    )
    .map((entry: { value: string }) => ({
      phaseKey: entry.value,
      phase: copyPhases[entry.value],
    }));
}

function configureWatchWidgetEmbedTwice({
  project,
  watchUuid,
  widget,
  mainTargetUuid,
}: {
  project: any;
  watchUuid: string;
  widget: any;
  mainTargetUuid: string;
}): void {
  configureWatchAppExtensionEmbed({
    project,
    watchTargetUuid: watchUuid,
    target: widget,
    targetProductName: WATCH_WIDGET_PRODUCT,
  });
  removeAppExtensionFromHostEmbed({
    project,
    mainTargetUuid,
    targetProductName: WATCH_WIDGET_PRODUCT,
  });
  configureWatchAppExtensionEmbed({
    project,
    watchTargetUuid: watchUuid,
    target: widget,
    targetProductName: WATCH_WIDGET_PRODUCT,
  });
  removeAppExtensionFromHostEmbed({
    project,
    mainTargetUuid,
    targetProductName: WATCH_WIDGET_PRODUCT,
  });
}

describe('configureWatchAppExtensionEmbed', () => {
  test('embeds appex on the watch target, not the phone host', () => {
    const { project, mainTargetUuid, watch } = setupWatchProject();
    applyBuildSettings({
      project,
      target: watch,
      buildSettings: {
        SDKROOT: 'watchos',
        WATCHOS_DEPLOYMENT_TARGET: '10.0',
        TARGETED_DEVICE_FAMILY: '"4"',
      },
    });

    const widget = addNativeTarget(project, {
      productName: WATCH_WIDGET_PRODUCT,
      type: 'app_extension',
    });

    const watchUuid = findWatchCompanionTargetUuid(project);
    expect(watchUuid).toBe(watch.uuid);

    configureWatchWidgetEmbedTwice({
      project,
      watchUuid: watchUuid!,
      widget,
      mainTargetUuid,
    });

    const watchEmbed = embedPhasesOnTarget(
      project,
      watchUuid!,
      'Embed App Extensions'
    );
    expect(watchEmbed).toHaveLength(1);
    expect(watchEmbed[0].phase.files).toHaveLength(1);
    expect(watchEmbed[0].phase.dstSubfolderSpec).toBe(13);

    const hostEmbed = embedPhasesOnTarget(
      project,
      mainTargetUuid,
      'Embed App Extensions'
    );
    expect(hostEmbed).toHaveLength(0);
  });
});
