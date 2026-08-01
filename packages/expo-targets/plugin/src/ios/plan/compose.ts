import { TYPE_CHARACTERISTICS } from '../../domain';
import { planAssets } from './assets';
import { planBuildSettings } from './buildSettings';
import { planEmbed } from './embed';
import { resolveIdentity } from './identity';
import { planInfoPlist } from './infoPlist';
import { planSafariResources } from './safari';
import { planSwiftSources } from './swiftSources';
import type { TargetPlanInput, XcodeTargetPlan } from './types';

/**
 * Turn resolved props plus an observed workspace into a complete target plan.
 * Everything downstream (file writes, PBX mutation) reads only this object.
 */
export function composeXcodeTargetPlan({
  props,
  expoConfig,
  workspace,
  paths,
  mainBuildSettings,
}: TargetPlanInput): XcodeTargetPlan {
  const typeConfig = TYPE_CHARACTERISTICS[props.type];
  const identity = resolveIdentity({
    props,
    mainBundleIdentifier: expoConfig.ios?.bundleIdentifier,
  });
  const infoPlist = planInfoPlist({ props, expoConfig, paths });

  return {
    identity,
    workspace,
    requiresCode: typeConfig.requiresCode,
    requiresEntitlements: typeConfig.requiresEntitlements,
    infoPlist,
    buildSettings: planBuildSettings({
      props,
      identity,
      expoConfig,
      mainBuildSettings,
      paths,
      infoPlistReferencePath: infoPlist.referencePath,
    }),
    swiftFiles: planSwiftSources({
      workspace,
      props,
      identity,
      platformProjectRoot: paths.platformProjectRoot,
    }),
    assets: planAssets({ workspace, props, identity, paths }),
    safari: planSafariResources({ workspace, props }),
    embed: planEmbed(props.type),
  };
}
