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
export type { ContentBlockerReloadOpts } from './modules/contentBlocker/index';
// Content Blocker
export { ContentBlocker } from './modules/contentBlocker/index';
export type { SharedData } from './modules/extension/index';
// Extension module
export {
  close,
  Extension,
  getExtensionNativeModule,
  getSharedData,
  openHostApp,
} from './modules/extension/index';
export type { FileProviderDomainOpts } from './modules/fileProvider/index';
// File Provider domain
export { FileProviderDomain } from './modules/fileProvider/index';
export type {
  LiveActivityContentState,
  LiveActivityStartOptions,
} from './modules/liveActivity/index';
// Live Activity
export {
  createLiveActivity,
  LiveActivity,
} from './modules/liveActivity/index';
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
export type {
  BaseTarget,
  ExtensionTarget,
  MessagesExtensionTarget,
  NonExtensionTarget,
  SafariExtensionTarget,
  Target,
} from './Target';
export { createTarget } from './Target';
export type {
  LiveActivityAttributesName,
  TargetName,
} from './generatedNames';
export type {
  KnownLiveActivityAttributes,
  KnownTargets,
} from './generatedNames';
export type { ExtensionBundleManifest } from './modules/extensionBundle/ExtensionUpdates';
export { createExtensionUpdates } from './modules/extensionBundle/ExtensionUpdates';
/** @deprecated Prefer `ExtensionUpdates.enable` */
export { enableExtensionUpdates } from './modules/extensionBundle/enableExtensionUpdates';
export {
  ExtensionUpdates,
  autoEnableExtensionUpdates,
} from './modules/extensionBundle/ExtensionUpdatesApi';
export {
  clearExtensionBundleNative,
  getExtensionBundleInfoNative,
  installExtensionBundleNative,
} from './modules/extensionBundle/nativeInstall';

// Host default: App Group sync when this package loads (no-op in appex / Node).
queueMicrotask(() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { autoEnableExtensionUpdates } =
      require('./modules/extensionBundle/ExtensionUpdatesApi') as {
        autoEnableExtensionUpdates: () => void;
      };
    autoEnableExtensionUpdates();
  } catch {
    // ignore
  }
});
