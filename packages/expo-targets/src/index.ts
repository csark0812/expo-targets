// Target API
export { createTarget } from './Target';
export type {
  Target,
  ExtensionTarget,
  MessagesExtensionTarget,
  NonExtensionTarget,
  SafariExtensionTarget,
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

// Safari module
export {
  isSafariExtension,
  getBrowserAPI,
  useBrowserTab,
  useBrowserStorage,
  useLocalBrowserStorage,
  useSendToContentScript,
  useSendToNative,
  useMessageListener,
  openTab,
  closePopup,
  copyToClipboard,
} from './modules/safari';
export type { BrowserTab } from './modules/safari';

// Config types
export type {
  TargetConfig,
  IOSTargetConfig,
  AndroidTargetConfig,
  ExtensionType,
  ReactNativeCompatibleType,
  Color,
} from '../plugin/src/config';
