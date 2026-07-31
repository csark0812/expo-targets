import { UI_TESTING_PRODUCT_TYPE, UITEST_TARGET_NAME } from './constants';
import { findUiTestTarget, type PbxProject, unquote } from './pbx';

const BUILD_SETTINGS: Record<string, string> = {
  PRODUCT_NAME: UITEST_TARGET_NAME,
  SWIFT_VERSION: '5.0',
  IPHONEOS_DEPLOYMENT_TARGET: '15.1',
  GENERATE_INFOPLIST_FILE: 'YES',
  TARGETED_DEVICE_FAMILY: '"1,2"',
  CODE_SIGNING_ALLOWED: 'YES',
  CODE_SIGNING_REQUIRED: 'NO',
};

function ensureBuildPhases(project: PbxProject, targetUuid: string): void {
  const target = project.pbxNativeTargetSection()[targetUuid];
  const phases = target.buildPhases ?? [];
  const hasSources = phases.some((p: any) =>
    String(p.comment ?? '').includes('Sources')
  );
  if (!hasSources) {
    project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', targetUuid);
  }
  const hasFrameworks = phases.some((p: any) =>
    String(p.comment ?? '').includes('Frameworks')
  );
  if (!hasFrameworks) {
    project.addBuildPhase(
      [],
      'PBXFrameworksBuildPhase',
      'Frameworks',
      targetUuid
    );
  }
  const hasResources = phases.some((p: any) =>
    String(p.comment ?? '').includes('Resources')
  );
  if (!hasResources) {
    project.addBuildPhase(
      [],
      'PBXResourcesBuildPhase',
      'Resources',
      targetUuid
    );
  }
}

function removeHostDependencyOnUiTest(opts: {
  project: PbxProject;
  hostUuid: string;
  uiTestUuid: string;
}): void {
  const { project, hostUuid, uiTestUuid } = opts;
  const host = project.pbxNativeTargetSection()[hostUuid];
  const deps = host.dependencies ?? [];
  const depSection = project.hash.project.objects.PBXTargetDependency ?? {};
  host.dependencies = deps.filter((entry: { value: string }) => {
    const dep = depSection[entry.value];
    return unquote(dep?.target) !== uiTestUuid && dep?.target !== uiTestUuid;
  });
}

function ensureUiTestDependsOnHost(opts: {
  project: PbxProject;
  hostUuid: string;
  uiTestUuid: string;
}): void {
  const { project, hostUuid, uiTestUuid } = opts;
  const uiTest = project.pbxNativeTargetSection()[uiTestUuid];
  const deps = uiTest.dependencies ?? [];
  const depSection = project.hash.project.objects.PBXTargetDependency ?? {};
  const already = deps.some((entry: { value: string }) => {
    const dep = depSection[entry.value];
    return unquote(dep?.target) === hostUuid || dep?.target === hostUuid;
  });
  if (!already) {
    project.addTargetDependency(uiTestUuid, [hostUuid]);
  }
}

const DROP_SETTINGS = [
  'INFOPLIST_FILE',
  'LD_RUNPATH_SEARCH_PATHS',
  'SKIP_INSTALL',
  'GCC_PREPROCESSOR_DEFINITIONS',
] as const;

function dropUnitTestDefaults(project: PbxProject): void {
  const target = project.pbxTargetByName(UITEST_TARGET_NAME);
  if (!target) {
    return;
  }
  const listUuid = target.buildConfigurationList;
  const list = project.pbxXCConfigurationList()[listUuid];
  const configs = project.pbxXCBuildConfigurationSection();
  for (const entry of list?.buildConfigurations ?? []) {
    const settings = configs[entry.value]?.buildSettings;
    if (!settings) {
      continue;
    }
    for (const key of DROP_SETTINGS) {
      delete settings[key];
    }
  }
}

function syncUiTestBuildSettings(opts: {
  project: PbxProject;
  hostName: string;
  hostBundleId: string;
}): void {
  const { project, hostName, hostBundleId } = opts;
  const bundleId = `${hostBundleId}.uitests`;
  for (const [key, value] of Object.entries(BUILD_SETTINGS)) {
    project.updateBuildProperty(key, value, undefined, UITEST_TARGET_NAME);
  }
  project.updateBuildProperty(
    'PRODUCT_BUNDLE_IDENTIFIER',
    bundleId,
    undefined,
    UITEST_TARGET_NAME
  );
  project.updateBuildProperty(
    'TEST_TARGET_NAME',
    hostName,
    undefined,
    UITEST_TARGET_NAME
  );
  dropUnitTestDefaults(project);
  const target = project.pbxTargetByName(UITEST_TARGET_NAME);
  if (target) {
    target.productType = `"${UI_TESTING_PRODUCT_TYPE}"`;
  }
}

function createUiTestTarget(opts: {
  project: PbxProject;
  hostUuid: string;
  hostBundleId: string;
}): { uuid: string; created: boolean } {
  const { project, hostUuid, hostBundleId } = opts;
  const created = project.addTarget(
    UITEST_TARGET_NAME,
    'unit_test_bundle',
    UITEST_TARGET_NAME,
    `${hostBundleId}.uitests`
  );
  // addTarget wires first-target → new target; flip to UITest → host.
  removeHostDependencyOnUiTest({
    project,
    hostUuid,
    uiTestUuid: created.uuid,
  });
  ensureUiTestDependsOnHost({
    project,
    hostUuid,
    uiTestUuid: created.uuid,
  });
  ensureBuildPhases(project, created.uuid);
  return { uuid: created.uuid, created: true };
}

export function ensureUiTestNativeTarget(opts: {
  project: PbxProject;
  hostUuid: string;
  hostName: string;
  hostBundleId: string;
}): { uuid: string; created: boolean } {
  const existing = findUiTestTarget(opts.project);
  if (existing) {
    ensureBuildPhases(opts.project, existing.uuid);
    ensureUiTestDependsOnHost({
      project: opts.project,
      hostUuid: opts.hostUuid,
      uiTestUuid: existing.uuid,
    });
    syncUiTestBuildSettings(opts);
    return { uuid: existing.uuid, created: false };
  }
  const result = createUiTestTarget(opts);
  syncUiTestBuildSettings(opts);
  return result;
}
