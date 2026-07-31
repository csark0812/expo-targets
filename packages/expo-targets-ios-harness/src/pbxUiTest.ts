import { UI_TESTING_PRODUCT_TYPE } from './constants';
import { findUiTestTarget, type PbxProject, unquote } from './pbx';

const SHARED_BUILD_SETTINGS: Record<string, string> = {
  SWIFT_VERSION: '5.0',
  IPHONEOS_DEPLOYMENT_TARGET: '15.1',
  GENERATE_INFOPLIST_FILE: 'YES',
  TARGETED_DEVICE_FAMILY: '"1,2"',
  CODE_SIGNING_ALLOWED: 'YES',
  CODE_SIGNING_REQUIRED: 'NO',
  SDKROOT: 'iphoneos',
};

const DROP_SETTINGS = [
  'INFOPLIST_FILE',
  'LD_RUNPATH_SEARCH_PATHS',
  'SKIP_INSTALL',
  'GCC_PREPROCESSOR_DEFINITIONS',
] as const;

function configListUuid(target: any): string {
  const raw = target.buildConfigurationList;
  if (raw && typeof raw === 'object' && 'value' in raw) {
    return String(raw.value);
  }
  return unquote(raw);
}

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

/** xcode.addTarget quotes names; pbxTargetByName matches comments literally. */
function normalizeUiTestTargetIdentity(
  project: PbxProject,
  targetUuid: string,
  targetName: string
): void {
  const section = project.pbxNativeTargetSection();
  const target = section[targetUuid];
  if (!target) {
    return;
  }
  target.name = targetName;
  target.productName = targetName;
  section[`${targetUuid}_comment`] = targetName;

  const productRef = unquote(target.productReference);
  const fileRefs = project.hash.project.objects.PBXFileReference ?? {};
  const ref = fileRefs[productRef];
  if (!ref) {
    return;
  }
  const xctest = `${targetName}.xctest`;
  ref.path = xctest;
  ref.name = xctest;
  ref.explicitFileType = 'wrapper.cfbundle';
  fileRefs[`${productRef}_comment`] = xctest;
}

function syncUiTestBuildSettings(opts: {
  project: PbxProject;
  targetUuid: string;
  targetName: string;
  hostName: string;
  hostBundleId: string;
}): void {
  const { project, targetUuid, targetName, hostName, hostBundleId } = opts;
  normalizeUiTestTargetIdentity(project, targetUuid, targetName);
  const target = project.pbxNativeTargetSection()[targetUuid];
  target.productType = `"${UI_TESTING_PRODUCT_TYPE}"`;

  const listUuid = configListUuid(target);
  const list = project.pbxXCConfigurationList()[listUuid];
  const configs = project.pbxXCBuildConfigurationSection();
  const bundleId = `${hostBundleId}.uitests`;

  for (const entry of list?.buildConfigurations ?? []) {
    const settings = configs[entry.value]?.buildSettings;
    if (!settings) {
      continue;
    }
    for (const key of DROP_SETTINGS) {
      delete settings[key];
    }
    Object.assign(settings, SHARED_BUILD_SETTINGS);
    settings.PRODUCT_NAME = targetName;
    settings.PRODUCT_BUNDLE_IDENTIFIER = bundleId;
    settings.TEST_TARGET_NAME = hostName;
  }
}

function createUiTestTarget(opts: {
  project: PbxProject;
  targetName: string;
  hostUuid: string;
  hostBundleId: string;
}): { uuid: string; created: boolean } {
  const { project, targetName, hostUuid, hostBundleId } = opts;
  const created = project.addTarget(
    targetName,
    'unit_test_bundle',
    targetName,
    `${hostBundleId}.uitests`
  );
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
  targetName: string;
  hostUuid: string;
  hostName: string;
  hostBundleId: string;
}): { uuid: string; created: boolean } {
  const existing = findUiTestTarget(opts.project, opts.targetName);
  if (existing) {
    ensureBuildPhases(opts.project, existing.uuid);
    ensureUiTestDependsOnHost({
      project: opts.project,
      hostUuid: opts.hostUuid,
      uiTestUuid: existing.uuid,
    });
    syncUiTestBuildSettings({
      project: opts.project,
      targetUuid: existing.uuid,
      targetName: opts.targetName,
      hostName: opts.hostName,
      hostBundleId: opts.hostBundleId,
    });
    return { uuid: existing.uuid, created: false };
  }
  const result = createUiTestTarget(opts);
  syncUiTestBuildSettings({
    project: opts.project,
    targetUuid: result.uuid,
    targetName: opts.targetName,
    hostName: opts.hostName,
    hostBundleId: opts.hostBundleId,
  });
  return result;
}
