// Target API

// Config types
export type {
  AndroidTargetConfig,
  AndroidWidgetProviderConfig,
  Color,
  ExtensionType,
  IOSTargetConfig,
  IosKindConfig,
  IosLiveActivityKindConfig,
  IosWidgetKindConfig,
  ReactNativeCompatibleType,
  TargetConfig,
  UiMode,
} from '../plugin/src/config';
export { isIllegalUiMode, resolveUiMode } from '../plugin/src/domain/uiMode';
export type {
  KnownLiveActivityAttributes,
  KnownTargets,
  KnownWidgetKinds,
  LiveActivityAttributesName,
  LiveActivityPayloadFor,
  LiveActivityPayloadRegistry,
  TargetName,
  WidgetKindName,
} from './generatedNames';
export type {
  LiveActivityEnvironment,
  LiveActivityLayout,
  LiveActivityLayoutComponent,
} from './liveActivityLayout';
export { createLiveActivityLayout } from './liveActivityLayout';
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
export type { ExtensionBundleManifest } from './modules/extensionBundle/ExtensionUpdates';
export { createExtensionUpdates } from './modules/extensionBundle/ExtensionUpdates';
export {
  autoEnableExtensionUpdates,
  ExtensionUpdates,
} from './modules/extensionBundle/ExtensionUpdatesApi';
/** @deprecated Prefer `ExtensionUpdates.enable` */
export { enableExtensionUpdates } from './modules/extensionBundle/enableExtensionUpdates';
export {
  clearExtensionBundleNative,
  getExtensionBundleInfoNative,
  installExtensionBundleNative,
} from './modules/extensionBundle/nativeInstall';
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
// Android notification local path (Wave 2)
export { AndroidNotification } from './modules/notification/index';
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
  getHostedWidgetCount,
  prepareVpnConsent,
  refreshAllTargets,
  requestPinWidget,
} from './modules/storage/index';
export type {
  HostProductRole,
  ResolvedHostProduct,
} from './resolveHostProduct';
export {
  formatUnknownHostProductError,
  galleryProductNames,
  isMultiProductWidgetFolder,
  resolveHostProduct,
} from './resolveHostProduct';
export type {
  BaseTarget,
  ExtensionTarget,
  MessagesExtensionTarget,
  NonExtensionTarget,
  SafariExtensionTarget,
  SetDataOptions,
  Target,
  TimelineEntry,
  WidgetFolderTarget,
  WidgetProductTarget,
} from './Target';
export { createTarget } from './Target';
export type {
  PushToStartTokenEvent,
  UserInteractionEvent,
} from './widgets';
export {
  addPushToStartTokenListener,
  addUserInteractionListener,
} from './widgets';

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
