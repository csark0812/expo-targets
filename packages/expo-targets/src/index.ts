export {
  AppGroupStorage,
  TargetStorage,
  createTarget,
  refreshAllTargets,
  close,
  openHostApp,
  clearSharedData,
} from './TargetStorage';
export type { Target } from './TargetStorage';
export type {
  TargetConfig,
  IOSTargetConfig,
  AndroidTargetConfig,
  ExtensionType,
  Color,
} from '../plugin/src/config';
