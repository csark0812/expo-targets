import * as fs from 'node:fs';
import * as path from 'node:path';
// @ts-expect-error - no types available for xcode package
import xcode from 'xcode';

import { getProjectName } from '../../plugin/build/ios/apply/pbx';
import {
  findReactNativeExtensionTargets,
  findStandaloneExtensionTargets,
  removeTargetBlock,
} from '../../plugin/build/ios/apply/podfile';
import {
  GENERATED_DIR_NAME,
  sanitizeTargetName,
} from '../../plugin/build/ios/utils/paths';

import type { ProjectContext } from './types';

export interface OrphanReport {
  sealedProducts: string[];
  xcodeTargets: string[];
  podfileTargets: string[];
}

function configuredProductNames(ctx: ProjectContext): Set<string> {
  const names = new Set<string>();
  for (const target of ctx.targets) {
    if (!target.config.platforms?.includes('ios')) {
      continue;
    }
    const configName = target.config.name || target.dirName;
    names.add(sanitizeTargetName(configName));
  }
  return names;
}

function listSealedProducts(
  platformProjectRoot: string,
  projectName: string
): string[] {
  const generatedRoot = path.join(
    platformProjectRoot,
    projectName,
    GENERATED_DIR_NAME
  );
  if (!fs.existsSync(generatedRoot)) {
    return [];
  }
  return fs
    .readdirSync(generatedRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function unquote(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return;
  }
  return value.replace(/^"|"$/g, '');
}

function sealedProductFromInfoPlist(infoPlist: string): string | undefined {
  if (!infoPlist.includes(`${GENERATED_DIR_NAME}/`)) {
    return;
  }
  const match = infoPlist.match(new RegExp(`${GENERATED_DIR_NAME}/([^/]+)/`));
  return match?.[1];
}

function collectOrphanFromTarget(opts: {
  target: { name?: string; buildConfigurationList?: string };
  objects: Record<string, any>;
  configs: Record<string, any>;
  configured: Set<string>;
  orphans: Set<string>;
}): void {
  const targetName = unquote(opts.target?.name);
  if (!targetName) {
    return;
  }
  const listUuid = opts.target.buildConfigurationList;
  if (!listUuid) {
    return;
  }
  const configList = opts.objects.XCConfigurationList?.[listUuid];
  for (const entry of configList?.buildConfigurations || []) {
    const settings = opts.configs[entry.value]?.buildSettings || {};
    const infoPlist = unquote(settings.INFOPLIST_FILE);
    if (!infoPlist) {
      continue;
    }
    const productName = sealedProductFromInfoPlist(infoPlist);
    if (productName && !opts.configured.has(productName)) {
      opts.orphans.add(targetName);
    }
  }
}

function findOrphanXcodeTargets(
  platformProjectRoot: string,
  configured: Set<string>
): string[] {
  const xcodeProjects = fs
    .readdirSync(platformProjectRoot)
    .filter((name) => name.endsWith('.xcodeproj'));
  if (xcodeProjects.length !== 1) {
    return [];
  }

  const pbxprojPath = path.join(
    platformProjectRoot,
    xcodeProjects[0]!,
    'project.pbxproj'
  );
  if (!fs.existsSync(pbxprojPath)) {
    return [];
  }

  const project = xcode.project(pbxprojPath);
  project.parseSync();
  const objects = project.hash.project.objects;
  const nativeTargets = objects.PBXNativeTarget || {};
  const configs = objects.XCBuildConfiguration || {};
  const orphans = new Set<string>();

  for (const key of Object.keys(nativeTargets)) {
    if (key.endsWith('_comment')) {
      continue;
    }
    collectOrphanFromTarget({
      target: nativeTargets[key],
      objects,
      configs,
      configured,
      orphans,
    });
  }

  return [...orphans].sort();
}

function findOrphanPodfileTargets(
  projectRoot: string,
  platformProjectRoot: string,
  configured: Set<string>
): string[] {
  const podfilePath = path.join(platformProjectRoot, 'Podfile');
  if (!fs.existsSync(podfilePath)) {
    return [];
  }

  const podfile = fs.readFileSync(podfilePath, 'utf8');
  const mainTargetName = getProjectName(projectRoot);
  const refs = [
    ...findReactNativeExtensionTargets(podfile, {
      mainTargetName,
      fallbackDeploymentTarget: '15.1',
    }),
    ...findStandaloneExtensionTargets(podfile, mainTargetName),
  ];

  return [...new Set(refs.map((ref) => ref.targetName))]
    .filter((name) => !configured.has(name))
    .sort((a, b) => a.localeCompare(b));
}

export function findOrphans(
  projectRoot: string,
  ctx: ProjectContext
): OrphanReport {
  const configured = configuredProductNames(ctx);
  const platformProjectRoot = path.join(projectRoot, 'ios');
  const projectName = getProjectName(projectRoot);

  return {
    sealedProducts: listSealedProducts(platformProjectRoot, projectName).filter(
      (name) => !configured.has(name)
    ),
    xcodeTargets: findOrphanXcodeTargets(platformProjectRoot, configured),
    podfileTargets: findOrphanPodfileTargets(
      projectRoot,
      platformProjectRoot,
      configured
    ),
  };
}

export interface CleanResult {
  removedSealed: string[];
  removedPodfileTargets: string[];
  skippedXcodeTargets: string[];
}

export function cleanOrphans(
  projectRoot: string,
  report: OrphanReport
): CleanResult {
  const platformProjectRoot = path.join(projectRoot, 'ios');
  const projectName = getProjectName(projectRoot);
  const removedSealed: string[] = [];
  const removedPodfileTargets: string[] = [];

  for (const productName of report.sealedProducts) {
    const productDir = path.join(
      platformProjectRoot,
      projectName,
      GENERATED_DIR_NAME,
      productName
    );
    if (fs.existsSync(productDir)) {
      fs.rmSync(productDir, { recursive: true, force: true });
      removedSealed.push(productName);
    }
  }

  const podfilePath = path.join(platformProjectRoot, 'Podfile');
  if (fs.existsSync(podfilePath) && report.podfileTargets.length > 0) {
    let podfile = fs.readFileSync(podfilePath, 'utf8');
    for (const targetName of report.podfileTargets) {
      const next = removeTargetBlock(podfile, targetName);
      if (next !== podfile) {
        removedPodfileTargets.push(targetName);
        podfile = next;
      }
    }
    fs.writeFileSync(podfilePath, podfile);
  }

  return {
    removedSealed,
    removedPodfileTargets,
    skippedXcodeTargets: report.xcodeTargets,
  };
}
