// Target API
export { createTarget } from './Target';
export type { Target } from './Target';

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
  Color,
} from '../plugin/src/config';
