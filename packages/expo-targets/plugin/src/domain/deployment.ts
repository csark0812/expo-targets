import { TYPE_MINIMUM_DEPLOYMENT_TARGETS } from '../config';
import type { ExtensionType } from './types';

/**
 * Minimum iOS deployment target per extension type.
 * The map itself still lives in `../config` (it is part of the documented
 * config surface); the domain re-exports it as the canonical lookup.
 */
export { TYPE_MINIMUM_DEPLOYMENT_TARGETS };

/**
 * Native React Native extensions link ExpoModulesCore, which requires iOS 15.1.
 */
export const EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET = '15.1';

export function minimumDeploymentTargetForType(type: ExtensionType): string {
  return TYPE_MINIMUM_DEPLOYMENT_TARGETS[type];
}
