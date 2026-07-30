import type { XcodeProject } from "@expo/config-plugins";

import type { Logger } from "../../../logger";
import type { XcodeTargetPlan } from "../../plan/types";
import {
  addFileToBuildPhase,
  hasBuildPhase,
  removeBuildPhases,
} from "./buildPhases";
import { applyBuildSettings, removeBuildSetting } from "./buildSettings";
import { ensureBundleReactNativePhase } from "./bundleReactNative";
import { configureAppClipEmbed, configureAppExtensionEmbed } from "./embed";
import { addExternalFileReference } from "./fileRefs";
import { addTargetToVirtualGroup, ensureExpoTargetsGroup } from "./groups";
import {
  addTargetDependency,
  findTargetByProductName,
  removeDuplicateTargets,
  setProductType,
} from "./targetLifecycle";
import type { XcodeTarget } from "./types";

interface ApplyContext {
  mainTarget: { uuid: string; target: any };
  logger: Logger;
}

/**
 * Create the native target, or reuse the one a previous prebuild left behind.
 */
function createOrReuseTarget(
  project: XcodeProject,
  plan: XcodeTargetPlan,
  logger: Logger,
): { target: XcodeTarget; reused: boolean } {
  const xcodeProject = project as any;
  const { targetProductName, targetName, targetType, bundleIdentifier } =
    plan.identity;

  removeDuplicateTargets({ project, productName: targetProductName });

  const existingTargetUuid = findTargetByProductName({
    project,
    productName: targetProductName,
  });

  if (existingTargetUuid) {
    logger.log(`Target ${targetProductName} already exists, reusing`);
    return {
      reused: true,
      target: {
        uuid: existingTargetUuid,
        target:
          xcodeProject.hash.project.objects.PBXNativeTarget[existingTargetUuid],
      },
    };
  }

  const target = xcodeProject.addTarget(
    targetProductName,
    targetType,
    targetProductName,
    bundleIdentifier,
  );

  if (!target?.uuid) {
    throw new Error(`Failed to create target for ${targetName}`);
  }

  logger.log(`Created native target: ${targetProductName}`);
  return { target, reused: false };
}

/**
 * Asset-only targets must not keep the Sources/Frameworks phases Xcode adds by
 * default; every target needs a Resources phase.
 */
function ensureBuildPhases(
  project: XcodeProject,
  plan: XcodeTargetPlan,
  target: XcodeTarget,
): void {
  const xcodeProject = project as any;
  const phases = plan.requiresCode
    ? [
        "PBXSourcesBuildPhase",
        "PBXFrameworksBuildPhase",
        "PBXResourcesBuildPhase",
      ]
    : ["PBXResourcesBuildPhase"];

  for (const phaseType of phases) {
    if (hasBuildPhase({ project, targetUuid: target.uuid, phaseType })) {
      continue;
    }
    const name = phaseType.replace("PBX", "").replace("BuildPhase", "");
    xcodeProject.addBuildPhase([], phaseType, name, target.uuid);
  }
}

function referenceSwiftFiles(
  project: XcodeProject,
  plan: XcodeTargetPlan,
  { target, groupUuid }: { target: XcodeTarget; groupUuid: string },
): void {
  for (const file of plan.swiftFiles) {
    const fileRefUuid = addExternalFileReference({
      project,
      groupUuid,
      filePath: file.referencePath,
      fileName: file.file,
    });

    addFileToBuildPhase({
      project,
      targetUuid: target.uuid,
      fileRefUuid,
      phaseType: "PBXSourcesBuildPhase",
    });
  }
}

function referenceAssets(
  project: XcodeProject,
  plan: XcodeTargetPlan,
  { target, groupUuid }: { target: XcodeTarget; groupUuid: string },
): void {
  const fileRefUuid = addExternalFileReference({
    project,
    groupUuid,
    filePath: plan.assets.referencePath,
    fileName: plan.assets.isStickers ? "Stickers.xcassets" : "Assets.xcassets",
    fileType: "folder.assetcatalog",
  });

  addFileToBuildPhase({
    project,
    targetUuid: target.uuid,
    fileRefUuid,
    phaseType: "PBXResourcesBuildPhase",
  });
}

function linkFrameworks(
  project: XcodeProject,
  plan: XcodeTargetPlan,
  target: XcodeTarget,
): void {
  if (!plan.requiresCode) {
    return;
  }

  const xcodeProject = project as any;
  for (const framework of plan.identity.frameworks) {
    xcodeProject.addFramework(`${framework}.framework`, {
      target: target.uuid,
      link: true,
    });
  }
}

function applyEmbed(
  project: XcodeProject,
  plan: XcodeTargetPlan,
  { target, mainTargetUuid }: { target: XcodeTarget; mainTargetUuid: string },
): void {
  const { targetProductName } = plan.identity;

  if (plan.embed.kind === "foundation-extension") {
    configureAppExtensionEmbed({ project, targetProductName });
    return;
  }

  if (plan.embed.kind === "app-clip") {
    configureAppClipEmbed({
      project,
      mainTargetUuid,
      target,
      targetProductName,
    });
  }
  // 'none' = standalone product (e.g. watch apps); nothing to embed.
}

/**
 * Apply a target plan to a parsed Xcode project.
 * Idempotent: running it twice against the same project is a no-op.
 */
export function applyXcodeTargetPlan(
  project: XcodeProject,
  plan: XcodeTargetPlan,
  { mainTarget, logger }: ApplyContext,
): XcodeTarget {
  const { target, reused } = createOrReuseTarget(project, plan, logger);

  setProductType({ target, productType: plan.identity.productType });

  if (!(plan.requiresCode || reused)) {
    for (const phaseType of [
      "PBXSourcesBuildPhase",
      "PBXFrameworksBuildPhase",
    ]) {
      removeBuildPhases({ project, targetUuid: target.uuid, phaseType });
    }
  }

  applyBuildSettings({
    project,
    target,
    buildSettings: plan.buildSettings,
    logger,
  });
  // Standalone apps and extensions should not inherit SKIP_INSTALL
  removeBuildSetting({ project, target, settingKey: "SKIP_INSTALL" });

  ensureBuildPhases(project, plan, target);

  const groupUuid = addTargetToVirtualGroup({
    project,
    targetName: plan.identity.targetName,
    virtualGroupUuid: ensureExpoTargetsGroup({ project }),
  });

  referenceSwiftFiles(project, plan, { target, groupUuid });
  referenceAssets(project, plan, { target, groupUuid });
  linkFrameworks(project, plan, target);

  addTargetDependency({
    project,
    mainTargetUuid: mainTarget.uuid,
    dependentTargetUuid: target.uuid,
  });

  applyEmbed(project, plan, { target, mainTargetUuid: mainTarget.uuid });

  if (plan.bundleReactNative) {
    ensureBundleReactNativePhase({
      project,
      targetUuid: target.uuid,
      plan: plan.bundleReactNative,
      logger,
    });
  }

  logger.log(`Configured target ${plan.identity.targetProductName}`);
  return target;
}
