/**
 * Domain layer: platform-agnostic facts about extension types.
 *
 * Nothing here touches the file system, the Xcode project, or Expo config mods.
 * Observe/plan/apply modules depend on this layer, never the other way around.
 */

export {
  APP_GROUP_ENTITLEMENT_KEY,
  EAS_APP_GROUP_TYPES,
  REQUIRES_APP_GROUP_TYPES,
  requiresAppGroup,
  shouldUseAppGroups,
} from './appGroups';
export {
  bundleIdentifierSuffixForType,
  TYPE_BUNDLE_IDENTIFIER_SUFFIXES,
} from './bundleIds';
export type {
  AndroidBucket,
  AndroidComponent,
  BaseTypeCharacteristics,
  TypeCharacteristicFlags,
  TypeCharacteristics,
} from './characteristics';
export {
  EXTENSION_POINT_IDENTIFIERS,
  EXTENSION_TYPES,
  getFrameworksForType,
  productTypeForType,
  SHOULD_USE_APP_GROUPS_BY_DEFAULT,
  TYPE_CHARACTERISTICS,
} from './characteristics';
export {
  EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET,
  minimumDeploymentTargetForType,
  TYPE_MINIMUM_DEPLOYMENT_TARGETS,
} from './deployment';
export {
  isReactNativeCompatible,
  isReactNativeNative,
  isReactNativeWeb,
  REACT_NATIVE_COMPATIBLE_TYPES,
  REACT_NATIVE_NATIVE_TYPES,
  REACT_NATIVE_WEB_TYPES,
} from './rnCompat';
export type { ExtensionType } from './types';
export type { UiMode } from './uiMode';
export { isIllegalUiMode, resolveUiMode } from './uiMode';
