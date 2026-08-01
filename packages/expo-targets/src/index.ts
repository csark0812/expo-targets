// Target API

// Config types
export type {
  AndroidTargetConfig,
  Color,
  ExtensionType,
  IOSTargetConfig,
  ReactNativeCompatibleType,
  TargetConfig,
} from '../plugin/src/config';
export type { SharedData } from './modules/extension/index';
// Extension module
export {
  close,
  Extension,
  getExtensionNativeModule,
  getSharedData,
  openHostApp,
} from './modules/extension/index';
export type {
  ConversationInfo,
  MessageLayout,
  PresentationStyle,
  SelectedMessage,
} from './modules/messages/index';
// Messages module
export {
  addEventListener as addMessagesEventListener,
  createSession,
  getConversationInfo,
  getPresentationStyle,
  requestPresentationStyle,
  sendMessage,
  sendUpdate,
} from './modules/messages/index';
export type { BrowserTab } from './modules/safari/index';
// Safari module
export {
  closePopup,
  copyToClipboard,
  getBrowserAPI,
  isSafariExtension,
  openTab,
  useBrowserStorage,
  useBrowserTab,
  useLocalBrowserStorage,
  useMessageListener,
  useSendToContentScript,
  useSendToNative,
} from './modules/safari/index';
// Storage module
export {
  AppGroupStorage,
  clearSharedData,
  refreshAllTargets,
} from './modules/storage/index';
export type {
  BaseTarget,
  ExtensionTarget,
  MessagesExtensionTarget,
  NonExtensionTarget,
  SafariExtensionTarget,
  Target,
} from './Target';
export { createTarget } from './Target';
