import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  findNativeTargetByProductName,
  getProductType,
} from '../../../test-utils/assertPbx';
import { loadPbx } from '../../../test-utils/loadPbx';
import { makeTempDir, removeTempDir } from '../../../test-utils/tempDir';
import { Logger } from '../../logger';
import type { IOSTargetProps } from '../plan/types';
import { withXcodeChanges } from './withXcodeChanges';

/**
 * L3 integration: drive the real `withXcodeChanges` mod against a throwaway
 * project on disk (stripped pbxproj fixture + a target directory) and assert
 * the pipeline's observable output — files written and PBX structure.
 *
 * Runs on Ubuntu without Xcode: the pbxproj is parsed and serialized by the
 * `xcode` package, and no build ever happens.
 */

const FIXTURE_PBXPROJ = path.join(
  __dirname,
  '../../../__fixtures__/pbx/prebuild-stripped/project.pbxproj'
);

const PROJECT_NAME = 'App';
const TARGET_DIRECTORY = 'targets/share-minimal';

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    removeTempDir(dir);
  }
  tempDirs = [];
});

function scaffoldProject(): { projectRoot: string; pbxprojPath: string } {
  const projectRoot = makeTempDir('expo-targets-l3-');
  tempDirs.push(projectRoot);

  const xcodeprojPath = path.join(
    projectRoot,
    'ios',
    `${PROJECT_NAME}.xcodeproj`
  );
  fs.mkdirSync(xcodeprojPath, { recursive: true });
  const pbxprojPath = path.join(xcodeprojPath, 'project.pbxproj');
  fs.copyFileSync(FIXTURE_PBXPROJ, pbxprojPath);

  // `IOSConfig.XcodeUtils.getProjectName` derives the project name from the
  // AppDelegate's directory, so the pipeline needs one on disk.
  const appDir = path.join(projectRoot, 'ios', PROJECT_NAME);
  fs.mkdirSync(appDir, { recursive: true });
  fs.writeFileSync(path.join(appDir, 'AppDelegate.swift'), '// AppDelegate\n');

  fs.mkdirSync(path.join(projectRoot, TARGET_DIRECTORY), { recursive: true });

  return { projectRoot, pbxprojPath };
}

function shareProps(): IOSTargetProps {
  return {
    type: 'share',
    name: 'ShareMinimal',
    entry: './index.share.js',
    directory: TARGET_DIRECTORY,
    configPath: path.join(TARGET_DIRECTORY, 'expo-target.config.json'),
    logger: new Logger(false),
  } as IOSTargetProps;
}

async function runPipeline(
  projectRoot: string,
  project: any,
  props: IOSTargetProps = shareProps()
): Promise<any> {
  const baseConfig: any = {
    name: PROJECT_NAME,
    slug: 'app',
    version: '1.2.3',
    scheme: 'myapp',
    ios: { bundleIdentifier: 'com.example.app', buildNumber: '7' },
  };

  const configWithMods: any = withXcodeChanges(baseConfig, props);

  return await configWithMods.mods.ios.xcodeproj({
    ...configWithMods,
    modResults: project,
    modRequest: {
      projectRoot,
      platformProjectRoot: path.join(projectRoot, 'ios'),
      modName: 'xcodeproj',
      platform: 'ios',
      projectName: PROJECT_NAME,
    },
  });
}

/** `sanitizeTargetName` appends `Target` to avoid colliding with the app. */
const PRODUCT_NAME = 'ShareMinimalTarget';

describe('withXcodeChanges integration', () => {
  test('integration: creates an app extension target for a share target', async () => {
    const { projectRoot, pbxprojPath } = scaffoldProject();
    const project = loadPbx(pbxprojPath);

    await runPipeline(projectRoot, project);

    const created = findNativeTargetByProductName(project, PRODUCT_NAME);
    expect(created).toBeDefined();
    expect(getProductType(created?.target)).toBe(
      'com.apple.product-type.app-extension'
    );

    // The pre-existing app target survives untouched.
    expect(findNativeTargetByProductName(project, PROJECT_NAME)).toBeDefined();

    // The extension is embedded in the app.
    expect(embeddedProductNames(project)).toContain(`${PRODUCT_NAME}.appex`);
  });

  test('integration: writes generated sources, Info.plist and assets to disk', async () => {
    const { projectRoot, pbxprojPath } = scaffoldProject();
    const project = loadPbx(pbxprojPath);

    await runPipeline(projectRoot, project);

    const buildDir = path.join(
      projectRoot,
      'ios',
      PROJECT_NAME,
      'ExpoTargetsGenerated',
      PRODUCT_NAME
    );
    const infoPlist = path.join(buildDir, 'Info.plist');

    expect(fs.existsSync(infoPlist)).toBe(true);
    expect(fs.readFileSync(infoPlist, 'utf8')).toContain(
      'com.apple.share-services'
    );
    expect(
      fs.existsSync(path.join(buildDir, 'ReactNativeViewController.swift'))
    ).toBe(true);
    expect(fs.existsSync(path.join(buildDir, 'Assets.xcassets'))).toBe(true);
  });
});

describe('withXcodeChanges integration target contents', () => {
  test('integration: references sources and settings on the new target', async () => {
    const { projectRoot, pbxprojPath } = scaffoldProject();
    const project = loadPbx(pbxprojPath);

    await runPipeline(projectRoot, project);

    const created = findNativeTargetByProductName(project, PRODUCT_NAME);
    const buildSettings = allBuildSettings(project, created?.target);

    expect(buildSettings.length).toBeGreaterThan(0);
    for (const settings of buildSettings) {
      expect(unquote(settings.PRODUCT_BUNDLE_IDENTIFIER)).toBe(
        'com.example.app.share'
      );
      expect(unquote(settings.INFOPLIST_FILE)).toBe(
        `${PROJECT_NAME}/ExpoTargetsGenerated/${PRODUCT_NAME}/Info.plist`
      );
      expect(unquote(settings.MARKETING_VERSION)).toBe('1.2.3');
      expect(unquote(settings.IPHONEOS_DEPLOYMENT_TARGET)).toBe('18.0');
    }

    const sourceFiles = buildPhaseFileNames(
      project,
      created?.target,
      'Sources'
    );
    expect(sourceFiles).toContain('ReactNativeViewController.swift');

    const resourceFiles = buildPhaseFileNames(
      project,
      created?.target,
      'Resources'
    );
    expect(resourceFiles).toContain('Assets.xcassets');
  });
});

describe('withXcodeChanges integration idempotency', () => {
  test('integration: is idempotent across two runs', async () => {
    const { projectRoot, pbxprojPath } = scaffoldProject();
    const project = loadPbx(pbxprojPath);

    await runPipeline(projectRoot, project);
    const firstPass = project.writeSync();

    await runPipeline(projectRoot, project);
    const secondPass = project.writeSync();

    expect(countTargetsNamed(project, PRODUCT_NAME)).toBe(1);
    expect(secondPass).toBe(firstPass);
  });
});

function unquote(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/^"|"$/g, '')
    : String(value);
}

function countTargetsNamed(project: any, productName: string): number {
  const nativeTargets = project.hash.project.objects.PBXNativeTarget || {};
  return Object.keys(nativeTargets).filter((uuid) => {
    if (uuid.endsWith('_comment')) {
      return false;
    }
    return unquote(nativeTargets[uuid]?.name) === productName;
  }).length;
}

function allBuildSettings(project: any, target: any): Record<string, any>[] {
  const configList =
    project.hash.project.objects.XCConfigurationList?.[
      target?.buildConfigurationList
    ];
  const configSection = project.hash.project.objects.XCBuildConfiguration || {};

  return (configList?.buildConfigurations || []).map(
    (entry: any) => configSection[entry.value]?.buildSettings || {}
  );
}

/** Resolve a PBXBuildFile entry to the file name of its file reference. */
function buildFileName(project: any, buildFileUuid: string): string {
  const objects = project.hash.project.objects;
  const fileRefUuid = objects.PBXBuildFile?.[buildFileUuid]?.fileRef;
  const fileRef = objects.PBXFileReference?.[fileRefUuid];
  return path.basename(unquote(fileRef?.name ?? fileRef?.path ?? ''));
}

function buildPhaseFileNames(
  project: any,
  target: any,
  phaseName: 'Sources' | 'Resources'
): string[] {
  const phases =
    project.hash.project.objects[`PBX${phaseName}BuildPhase`] || {};
  const targetPhaseUuids = new Set(
    (target?.buildPhases || []).map((phase: any) => phase.value)
  );

  const names: string[] = [];
  for (const uuid of Object.keys(phases)) {
    if (uuid.endsWith('_comment') || !targetPhaseUuids.has(uuid)) {
      continue;
    }
    for (const file of phases[uuid].files || []) {
      names.push(buildFileName(project, file.value));
    }
  }
  return names;
}

/** Product file names in the app's "Embed App Extensions" copy files phase. */
function embeddedProductNames(project: any): string[] {
  const phases = project.hash.project.objects.PBXCopyFilesBuildPhase || {};
  const names: string[] = [];

  for (const uuid of Object.keys(phases)) {
    if (uuid.endsWith('_comment')) {
      continue;
    }
    for (const file of phases[uuid].files || []) {
      names.push(String(file.comment ?? '').replace(/ in .*$/, ''));
    }
  }
  return names;
}
