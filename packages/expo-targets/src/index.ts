// Target API
export { createTarget } from './Target';
export type {
  Target,
  ExtensionTarget,
  NonExtensionTarget,
  BaseTarget,
} from './Target';

// Storage module
export {
  AppGroupStorage,
  refreshAllTargets,
  clearSharedData,
} from './modules/storage';

// Extension module
export {
  Extension,
  close,
  openHostApp,
  getSharedData,
} from './modules/extension';
export type { SharedData } from './modules/extension';

// Config types
export type {
  TargetConfig,
  IOSTargetConfig,
  AndroidTargetConfig,
  ExtensionType,
  ReactNativeCompatibleType,
  Color,
} from '../plugin/src/config';
