import type { ExtensionType } from '../../domain';
import type { PodfilePlan } from './types';

/**
 * Plan the Podfile entry for one target.
 *
 * Standalone targets are inserted as siblings of the main app target so
 * CocoaPods does not autolink Expo modules into them; React Native targets are
 * nested inside the main target to inherit its search paths.
 */
export function planPodfile({
  targetName,
  deploymentTarget,
  extensionType,
  standalone,
  expoUiWidget,
  excludedPackages,
  podsRbContent,
}: {
  targetName: string;
  deploymentTarget: string;
  extensionType: ExtensionType;
  standalone: boolean;
  expoUiWidget?: boolean;
  excludedPackages?: string[];
  podsRbContent?: string;
}): PodfilePlan {
  return {
    targetName,
    deploymentTarget,
    extensionType,
    standalone,
    expoUiWidget,
    excludedPackages,
    podsRbContent,
  };
}
