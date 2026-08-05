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
  AttachmentPayload,
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
  insertAttachment,
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
// File Provider domain
export { FileProviderDomain } from './modules/fileProvider/index';
export type { FileProviderDomainOpts } from './modules/fileProvider/index';
// Content Blocker
export { ContentBlocker } from './modules/contentBlocker/index';
export type { ContentBlockerReloadOpts } from './modules/contentBlocker/index';
// Live Activity
export {
  LiveActivity,
  createLiveActivity,
} from './modules/liveActivity/index';
export type {
  LiveActivityStartOptions,
  LiveActivityContentState,
} from './modules/liveActivity/index';
export type {
  BaseTarget,
  ExtensionTarget,
  MessagesExtensionTarget,
  NonExtensionTarget,
  SafariExtensionTarget,
  Target,
} from './Target';
export { createTarget } from './Target';
