/**
 * Plan layer: pure decisions.
 *
 * Planners take resolved props, the Expo config and an observed workspace, and
 * return data describing what the apply layer should do. No file system access,
 * no Xcode project access.
 */

export { planAssets } from './assets';
export {
  buildShareExtensionActivationRules,
  getTargetInfoPlistForType,
} from './buildInfoPlist';
export { planBuildSettings } from './buildSettings';
export { planBundleReactNative } from './bundleReactNative';
export { composeXcodeTargetPlan } from './compose';
export { planEmbed } from './embed';
export { planEntitlements } from './entitlements';
export { resolveIdentity } from './identity';
export { planInfoPlist } from './infoPlist';
export { planPodfile } from './podfile';
export { planSafariResources } from './safari';
export { planSafariWebBundle } from './safariWebBundle';
export { planSwiftSources } from './swiftSources';
export type {
  AssetPlan,
  BundleReactNativePlan,
  ColorsetPlan,
  EmbedPlan,
  EntitlementsPlan,
  ImagesetPlan,
  InfoPlistPlan,
  IOSTargetProps,
  PodfilePlan,
  ProjectPaths,
  SafariResourcesPlan,
  SafariWebBundlePlan,
  StickerPackPlan,
  StickersPlan,
  SwiftFilePlan,
  SwiftTemplatePlan,
  TargetIdentity,
  TargetPlanInput,
  XcodeTargetPlan,
} from './types';
