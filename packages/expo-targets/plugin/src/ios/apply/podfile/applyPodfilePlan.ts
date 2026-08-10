import type { Logger } from '../../../logger';
import type { PodfilePlan } from '../../plan/types';
import {
  ensureExcludedPackagesPostIntegrate,
  ensureExpoWidgetsPostInstall,
  ensureExtensionDeploymentTargets,
  ensureMainTargetUsesFrameworks,
  ensureReactNativeExtensionFrameworkPaths,
  ensureResourceBundleCodeSigning,
  generateExpoUiWidgetTargetBlock,
  generateReactNativeTargetBlock,
  generateStandaloneTargetBlock,
  hasTargetBlock,
  insertTargetBlock,
  mainTargetUsesFrameworks,
  removeTargetBlock,
  updatePodfilePlatform,
} from './podfile';
import {
  findExcludedPackagesTargets,
  findReactNativeExtensionTargets,
  findStandaloneExtensionTargets,
  highestDeploymentTarget,
} from './scan';

interface PodfileContext {
  mainTargetName: string;
  logger: Logger;
}

function targetBlockFor(
  podfile: string,
  plan: PodfilePlan,
  mainTargetName: string
): string {
  if (plan.expoUiWidget) {
    return generateExpoUiWidgetTargetBlock({
      targetName: plan.targetName,
      deploymentTarget: plan.deploymentTarget,
      podsRbContent: plan.podsRbContent,
    });
  }

  if (!plan.standalone) {
    return generateReactNativeTargetBlock({
      targetName: plan.targetName,
      deploymentTarget: plan.deploymentTarget,
      extensionType: plan.extensionType,
      podsRbContent: plan.podsRbContent,
      excludedPackages: plan.excludedPackages,
    });
  }

  // CocoaPods requires the host app and its extensions to agree on
  // use_frameworks!, so mirror whatever the main target ended up with.
  return generateStandaloneTargetBlock({
    targetName: plan.targetName,
    deploymentTarget: plan.deploymentTarget,
    useFrameworks: mainTargetUsesFrameworks(podfile, mainTargetName),
    podsRbContent: plan.podsRbContent,
  });
}

/**
 * `inherit! :search_paths` alone is not enough for Swift imports in React
 * Native extensions; they need explicit framework search paths.
 * Also rebuild the excludedPackages post_integrate hook from all nested markers.
 */
function applyReactNativePostInstall(
  podfile: string,
  plan: PodfilePlan,
  mainTargetName: string
): string {
  const reactNativeTargets = findReactNativeExtensionTargets(podfile, {
    mainTargetName,
    fallbackDeploymentTarget: plan.deploymentTarget,
  });

  let next = podfile;
  if (reactNativeTargets.length > 0) {
    next = ensureReactNativeExtensionFrameworkPaths(
      next,
      reactNativeTargets,
      mainTargetName
    );
  }

  return ensureExcludedPackagesPostIntegrate(
    next,
    findExcludedPackagesTargets(next, mainTargetName)
  );
}

/**
 * Standalone extensions need their deployment targets re-applied after
 * `react_native_post_install` runs, because CocoaPods generates the xcconfig.
 */
function applyStandalonePostInstall(
  podfile: string,
  mainTargetName: string
): string {
  const extensionTargets = findStandaloneExtensionTargets(
    podfile,
    mainTargetName
  );
  const highest = highestDeploymentTarget(extensionTargets);

  if (!highest) {
    return podfile;
  }

  return ensureExtensionDeploymentTargets(
    updatePodfilePlatform(podfile, highest),
    extensionTargets
  );
}

/**
 * Apply a Podfile plan to Podfile contents and return the new contents.
 */
export function applyPodfilePlan(
  podfile: string,
  plan: PodfilePlan,
  { mainTargetName, logger }: PodfileContext
): string {
  let next = podfile;

  // Remove any existing block first so the target lands in the right place.
  if (hasTargetBlock(next, plan.targetName)) {
    logger.log(
      `Removing existing '${plan.targetName}' target to ensure correct placement`
    );
    next = removeTargetBlock(next, plan.targetName);
  }

  next = ensureMainTargetUsesFrameworks(next, mainTargetName);
  // Must run before any other post_install modification.
  next = ensureResourceBundleCodeSigning(next);

  next = insertTargetBlock(next, targetBlockFor(next, plan, mainTargetName), {
    standalone: plan.standalone,
    logger,
  });

  if (plan.expoUiWidget) {
    next = ensureExpoWidgetsPostInstall(next);
  }

  logger.log(
    `Updated Podfile for ${plan.standalone ? 'standalone' : 'React Native'} target: ${plan.targetName}${plan.expoUiWidget ? ' (expo-ui widget)' : ''}`
  );

  return plan.standalone
    ? applyStandalonePostInstall(next, mainTargetName)
    : applyReactNativePostInstall(next, plan, mainTargetName);
}
