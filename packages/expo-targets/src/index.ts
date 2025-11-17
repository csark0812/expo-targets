// Target API
export { createTarget } from './Target';
export type {
  Target,
  ExtensionTarget,
  MessagesExtensionTarget,
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

// Messages module
export {
  getPresentationStyle,
  requestPresentationStyle,
  sendMessage,
  sendUpdate,
  createSession,
  getConversationInfo,
  addEventListener as addMessagesEventListener,
} from './modules/messages';
export type {
  PresentationStyle,
  MessageLayout,
  ConversationInfo,
  SelectedMessage,
} from './modules/messages';

// Config types
export type {
  TargetConfig,
  IOSTargetConfig,
  AndroidTargetConfig,
  ExtensionType,
  ReactNativeCompatibleType,
  Color,
} from '../plugin/src/config';
