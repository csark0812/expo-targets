export {
  AppGroupStorage,
  TargetStorage,
  defineTarget,
  refreshAllTargets,
  close,
  openHostApp,
  clearSharedData,
} from './TargetStorage';
export type { Target, DefineTargetOptions } from './TargetStorage';
export type {
  TargetConfig,
  IOSTargetConfig,
  AndroidTargetConfig,
  ExtensionType,
  Color,
} from '../plugin/src/config';
