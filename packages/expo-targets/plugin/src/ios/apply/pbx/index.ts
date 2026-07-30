/**
 * Apply layer: mutations against a parsed `project.pbxproj`.
 *
 * Every function here takes an already-parsed project plus plain data and
 * mutates the project. Decisions belong in `ios/plan`, observation in
 * `ios/observe`; nothing in this folder reads user config.
 */

export { applyXcodeTargetPlan } from './applyTargetPlan';
export {
  addFileToBuildPhase,
  hasBuildPhase,
  removeBuildPhases,
} from './buildPhases';
export {
  buildExtensionBundleShellScript,
  ensureBundleReactNativePhase,
} from './bundleReactNative';
export {
  applyBuildSettings,
  getMainAppBuildSettings,
  removeBuildSetting,
} from './buildSettings';
export { configureAppClipEmbed, configureAppExtensionEmbed } from './embed';
export { addExternalFileReference, addTargetAssets } from './fileRefs';
export {
  addBuildSourceFileToGroup,
  addResourceFileToGroup,
  addTargetToVirtualGroup,
  ensureExpoTargetsGroup,
  ensureGroupRecursively,
} from './groups';
export {
  addTargetDependency,
  findAllTargetsByProductName,
  findTargetByProductName,
  getApplicationNativeTarget,
  getProjectName,
  hasTargetDependency,
  removeDuplicateTargets,
  setProductType,
} from './targetLifecycle';
export type { XcodeTarget } from './types';
