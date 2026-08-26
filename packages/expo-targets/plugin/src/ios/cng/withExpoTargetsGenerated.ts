import fs from 'node:fs';
import path from 'node:path';
import {
  type ConfigPlugin,
  withDangerousMod,
  withXcodeProject,
} from '@expo/config-plugins';

import type {
  AppIntentHostConfig,
  AppShortcutConfig,
  TargetConfig,
} from '../../config';
import {
  addExternalFileReference,
  addFileToBuildPhase,
  findTargetByProductName,
  getApplicationNativeTarget,
  getProjectName,
} from '../apply/pbx';
import * as Paths from '../utils/paths';
import { resolveLiveActivityConfigs } from '../utils/resolveIosKinds';
import {
  generateAppIntentShellSwift,
  generateAppShortcutsProviderSwift,
} from './appShortcutsCodegen';
import {
  generateLiveActivityAttributesSwift,
  generateLiveActivityBridgeSwift,
} from './liveActivityCodegen';

export { GENERATED_DIR_NAME } from '../utils/paths';

type GeneratedFilePlan = {
  fileName: string;
  contents: string;
  /** Use MAIN for the application target; otherwise Xcode native target product name */
  targetNames: ('MAIN' | string)[];
};

type WrittenGeneratedFile = {
  relativePath: string;
  fileName: string;
  targetNames: ('MAIN' | string)[];
};

function widgetProductName(target: TargetConfig): string {
  return Paths.sanitizeTargetName(target.displayName || target.name);
}

function pushLiveActivityPlans(
  plans: GeneratedFilePlan[],
  target: TargetConfig
): void {
  if (!(target.type === 'widget')) {
    return;
  }
  const liveActivities = resolveLiveActivityConfigs(target);
  if (liveActivities.length === 0) {
    return;
  }
  // expo-ui widgets use WidgetLiveActivity blob attrs — skip typed CNG.
  if (target.entry) {
    return;
  }
  for (const la of liveActivities) {
    if (!la.attributesName) {
      continue;
    }
    plans.push({
      fileName: `${la.attributesName}.swift`,
      contents: generateLiveActivityAttributesSwift(la),
      targetNames: ['MAIN', widgetProductName(target)],
    });
    plans.push({
      fileName: `${la.attributesName}Bridge.swift`,
      contents: generateLiveActivityBridgeSwift(la),
      targetNames: ['MAIN'],
    });
  }
}

function pushAppIntentPlans(
  plans: GeneratedFilePlan[],
  target: TargetConfig
): void {
  if (target.type !== 'app-intent') return;
  const intents = (target.ios?.appIntents ?? []) as AppIntentHostConfig[];
  const shortcuts = (target.ios?.appShortcuts ?? []) as AppShortcutConfig[];

  for (const intent of intents) {
    plans.push({
      fileName: `${intent.className}.generated.swift`,
      contents: generateAppIntentShellSwift(intent),
      targetNames: ['MAIN'],
    });
  }

  if (shortcuts.length > 0) {
    plans.push({
      fileName: 'ExpoTargetsAppShortcuts.swift',
      contents: generateAppShortcutsProviderSwift(
        'ExpoTargetsAppShortcuts',
        shortcuts
      ),
      targetNames: ['MAIN'],
    });
  }
}

function collectPlans(targets: TargetConfig[]): GeneratedFilePlan[] {
  const plans: GeneratedFilePlan[] = [];
  for (const target of targets) {
    pushLiveActivityPlans(plans, target);
    pushAppIntentPlans(plans, target);
  }
  return plans;
}

function targetsFromConfig(config: { extra?: { targets?: TargetConfig[] } }) {
  return (config.extra?.targets ?? []) as TargetConfig[];
}

function writeGeneratedSwiftFiles(options: {
  platformRoot: string;
  projectName: string;
  plans: GeneratedFilePlan[];
  written: WrittenGeneratedFile[];
}): void {
  const { platformRoot, projectName, plans, written } = options;
  const outDir = path.join(platformRoot, projectName, Paths.GENERATED_DIR_NAME);
  fs.mkdirSync(outDir, { recursive: true });

  clearRootGeneratedSwiftFiles(outDir);

  written.length = 0;
  for (const plan of plans) {
    fs.writeFileSync(path.join(outDir, plan.fileName), plan.contents);
    written.push({
      relativePath: `${projectName}/${Paths.GENERATED_DIR_NAME}/${plan.fileName}`,
      fileName: plan.fileName,
      targetNames: plan.targetNames,
    });
  }
}

/**
 * Host CNG invariant: only delete root-level `*.swift` under ExpoTargetsGenerated.
 * Never recursively wipe product subdirs (sealed target build output).
 */
export function clearRootGeneratedSwiftFiles(outDir: string): void {
  if (!fs.existsSync(outDir)) {
    return;
  }
  for (const existing of fs.readdirSync(outDir)) {
    if (existing.endsWith('.swift')) {
      fs.unlinkSync(path.join(outDir, existing));
    }
  }
}

function ensureGeneratedGroup(
  project: any,
  projectName: string
): string | null {
  const appGroupKey =
    project.findPBXGroupKey({ name: projectName }) ||
    project.findPBXGroupKey({ path: projectName });

  let generatedGroupKey = project.findPBXGroupKey({
    name: Paths.GENERATED_DIR_NAME,
  });
  if (!generatedGroupKey && appGroupKey) {
    // Name-only group (no path) — file refs use ios/<App>/ExpoTargetsGenerated/…
    // like AppDelegate under the app group (path = ETTrick/AppDelegate.swift).
    generatedGroupKey = project.pbxCreateGroup(
      Paths.GENERATED_DIR_NAME,
      undefined
    );
    const mainGroup = project.hash.project.objects.PBXGroup[appGroupKey];
    if (mainGroup?.children) {
      mainGroup.children.push({
        value: generatedGroupKey,
        comment: Paths.GENERATED_DIR_NAME,
      });
    }
  }

  // Strip a mistaken path from older prebuilds so resolution is project-relative.
  if (generatedGroupKey) {
    const group = project.hash.project.objects.PBXGroup[generatedGroupKey];
    if (group?.path) {
      delete group.path;
    }
  }

  return generatedGroupKey || appGroupKey;
}

function addFileToTargets(options: {
  project: any;
  fileRefUuid: string;
  targetNames: ('MAIN' | string)[];
  mainTargetUuid: string;
}): void {
  const { project, fileRefUuid, targetNames, mainTargetUuid } = options;
  for (const targetName of targetNames) {
    const targetUuid =
      targetName === 'MAIN'
        ? mainTargetUuid
        : findTargetByProductName({ project, productName: targetName });
    if (!targetUuid) continue;
    try {
      addFileToBuildPhase({
        project,
        targetUuid,
        fileRefUuid,
        phaseType: 'PBXSourcesBuildPhase',
      });
    } catch {
      // already in phase
    }
  }
}

function wireGeneratedFilesToXcode(options: {
  project: any;
  written: WrittenGeneratedFile[];
  groupForFiles: string | null;
  mainTargetUuid: string;
}): void {
  const { project, written, groupForFiles, mainTargetUuid } = options;
  if (!groupForFiles) return;

  for (const file of written) {
    // Project-relative under ios/ (ETTrick group has no path — same as AppDelegate).
    const fileRefUuid = addExternalFileReference({
      project,
      groupUuid: groupForFiles,
      filePath: file.relativePath,
      fileName: file.fileName,
    });

    addFileToTargets({
      project,
      fileRefUuid,
      targetNames: file.targetNames,
      mainTargetUuid,
    });
  }
}

function findPerformHookPaths(targetsRoot: string, hookFile: string): string[] {
  const hits: string[] = [];
  for (const dir of fs.readdirSync(targetsRoot)) {
    const absolute = path.join(targetsRoot, dir, 'ios', hookFile);
    if (fs.existsSync(absolute)) hits.push(absolute);
  }
  return hits;
}

function addHookFileToMainApp(options: {
  project: any;
  platformRoot: string;
  absolute: string;
  hookFile: string;
  groupForFiles: string;
  mainTargetUuid: string;
}): void {
  const {
    project,
    platformRoot,
    absolute,
    hookFile,
    groupForFiles,
    mainTargetUuid,
  } = options;
  const relFromIos = path.relative(platformRoot, absolute).replace(/\\/g, '/');
  const fileRefUuid = addExternalFileReference({
    project,
    groupUuid: groupForFiles,
    filePath: relFromIos,
    fileName: hookFile,
  });
  try {
    addFileToBuildPhase({
      project,
      targetUuid: mainTargetUuid,
      fileRefUuid,
      phaseType: 'PBXSourcesBuildPhase',
    });
  } catch {
    // already present
  }
}

function wirePerformHooksToMainApp(options: {
  project: any;
  projectRoot: string;
  platformRoot: string;
  targets: TargetConfig[];
  groupForFiles: string | null;
  mainTargetUuid: string;
}): void {
  const {
    project,
    projectRoot,
    platformRoot,
    targets,
    groupForFiles,
    mainTargetUuid,
  } = options;
  if (!groupForFiles) return;

  const targetsRoot = path.join(projectRoot, 'targets');
  if (!fs.existsSync(targetsRoot)) return;

  const appIntentTargets = targets.filter((t) => t.type === 'app-intent');
  for (const target of appIntentTargets) {
    const intents = (target.ios?.appIntents ?? []) as AppIntentHostConfig[];
    for (const intent of intents) {
      const hookFile = `${intent.performHook}.swift`;
      for (const absolute of findPerformHookPaths(targetsRoot, hookFile)) {
        addHookFileToMainApp({
          project,
          platformRoot,
          absolute,
          hookFile,
          groupForFiles,
          mainTargetUuid,
        });
      }
    }
  }
}

function ensureWrittenPaths(
  written: WrittenGeneratedFile[],
  plans: GeneratedFilePlan[],
  projectName: string
): void {
  if (written.length > 0) return;
  for (const plan of plans) {
    written.push({
      relativePath: `${projectName}/${Paths.GENERATED_DIR_NAME}/${plan.fileName}`,
      fileName: plan.fileName,
      targetNames: plan.targetNames,
    });
  }
}

function withGeneratedSwiftOnDisk(
  config: Parameters<ConfigPlugin>[0],
  written: WrittenGeneratedFile[]
) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const plans = collectPlans(targetsFromConfig(cfg));
      if (plans.length === 0) return cfg;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const projectName =
        cfg.modRequest.projectName || getProjectName(platformRoot);
      writeGeneratedSwiftFiles({ platformRoot, projectName, plans, written });
      return cfg;
    },
  ]);
}

function withGeneratedSwiftInXcode(
  config: Parameters<ConfigPlugin>[0],
  written: WrittenGeneratedFile[]
) {
  return withXcodeProject(config, (cfg) => {
    const targets = targetsFromConfig(cfg);
    const plans = collectPlans(targets);
    if (plans.length === 0) return cfg;

    const project = cfg.modResults as any;
    const platformRoot = cfg.modRequest.platformProjectRoot;
    const projectRoot = cfg.modRequest.projectRoot;
    const projectName =
      cfg.modRequest.projectName || getProjectName(platformRoot);
    ensureWrittenPaths(written, plans, projectName);

    const mainTarget = getApplicationNativeTarget({ project, projectName });
    const groupForFiles = ensureGeneratedGroup(project, projectName);
    wireGeneratedFilesToXcode({
      project,
      written,
      groupForFiles,
      mainTargetUuid: mainTarget.uuid,
    });
    wirePerformHooksToMainApp({
      project,
      projectRoot,
      platformRoot,
      targets,
      groupForFiles,
      mainTargetUuid: mainTarget.uuid,
    });
    return cfg;
  });
}

/**
 * Emit sealed ExpoTargetsGenerated Swift and wire Xcode membership.
 *
 * Register this plugin *before* withTargetsDir so the xcodeproj mod is
 * innermost and runs *after* extension targets exist (Expo mods are LIFO).
 * Plans are collected at mod time from config.extra.targets.
 */
export const withExpoTargetsGenerated: ConfigPlugin = (config) => {
  const written: WrittenGeneratedFile[] = [];
  config = withGeneratedSwiftOnDisk(config, written);
  config = withGeneratedSwiftInXcode(config, written);
  return config;
};
