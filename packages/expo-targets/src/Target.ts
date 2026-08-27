import { AppRegistry, Platform } from 'react-native';
import type {
  ExtensionType,
  ReactNativeCompatibleType,
  TargetConfig,
} from '../plugin/src/config';
import { resolveUiMode } from '../plugin/src/domain/uiMode';
import { resolveLiveActivityConfigs } from '../plugin/src/ios/utils/resolveIosKinds';
import type {
  LiveActivityAttributesName,
  MultiProductWidgetFolderName,
  TargetName,
  WidgetKindName,
} from './generatedNames';
import { Extension, type SharedData } from './modules/extension/index';
import {
  buildLiveActivityHandle,
  type LiveActivityHandle,
} from './modules/liveActivity/index';
import {
  type ConversationInfo,
  type MessageLayout,
  Messages,
  type PresentationStyle,
} from './modules/messages/index';
import {
  bootstrapSafariExtension,
  closePopup,
  copyToClipboard,
  isSafariExtension,
  openTab,
} from './modules/safari/index';
import { AppGroupStorage } from './modules/storage/index';
import { listTargets } from './modules/targetsConfig';
import {
  formatUnknownHostProductError,
  galleryProductNames,
  isMultiProductWidgetFolder,
  resolveHostProduct,
} from './resolveHostProduct';

export type SetDataOptions = {
  /**
   * Widget product handles default to `true` (reload after write).
   * Share/action/clip default to `false`. Pass `refresh: false` to batch widget writes.
   */
  refresh?: boolean;
};

/** Dated timeline entry for expo-ui widgets (maps to expo-widgets updateTimeline). */
export type TimelineEntry<T extends Record<string, any> = Record<string, any>> =
  {
    date: Date;
    props: T;
  };

type ExpoUiWidgetHandle = {
  updateSnapshot: (props: Record<string, any>) => void;
  updateTimeline: (entries: TimelineEntry[]) => void;
  getTimeline: () => Promise<TimelineEntry[]>;
  reload: () => void;
};

const expoUiWidgets = new Map<string, ExpoUiWidgetHandle>();

export interface WidgetProductTarget extends BaseTarget {
  widget: (
    kindName: WidgetKindName,
    layout?: React.ComponentType<any>
  ) => BaseTarget;
  liveActivity: (
    attributesName?: LiveActivityAttributesName
  ) => LiveActivityHandle<LiveActivityAttributesName>;
}

export interface WidgetFolderTarget {
  name: string;
  type: 'widget' | 'watch-widget';
  appGroup: string;
  config: TargetConfig;
  /** Gallery kind or Android provider handle. */
  widget: (
    kindName: WidgetKindName,
    layout?: React.ComponentType<any>
  ) => BaseTarget;
  /** Live Activity handle from this folder's ios.liveActivity / ios.liveActivities config. */
  liveActivity: (
    attributesName?: LiveActivityAttributesName
  ) => LiveActivityHandle<LiveActivityAttributesName>;
  /** Write the same payload to every gallery kind / provider in this folder. */
  setData: (data: Record<string, any>, options?: SetDataOptions) => void;
  /** Reload every gallery kind / provider in this folder. */
  refresh: () => void;
}

export interface BaseTarget {
  name: string;
  type: ExtensionType;
  appGroup: string;
  storage: AppGroupStorage;
  config: TargetConfig;
  setData: (data: Record<string, any>, options?: SetDataOptions) => void;
  getData: <T extends Record<string, any>>() => T;
  refresh: () => void;
  /** Schedule dated props for an expo-ui widget (iOS sandbox). */
  setTimeline: (entries: TimelineEntry[]) => void;
  /** Read back the expo-ui widget timeline (iOS). */
  getTimeline: <
    T extends Record<string, any> = Record<string, any>,
  >() => Promise<TimelineEntry<T>[]>;
}

export interface ExtensionTarget extends BaseTarget {
  type: ReactNativeCompatibleType;
  close: () => void;
  openHostApp: (path?: string) => void;
  getSharedData: () => SharedData | null;
}

export interface MessagesExtensionTarget
  extends Omit<ExtensionTarget, 'close'> {
  type: 'messages';
  getPresentationStyle: () => PresentationStyle | null;
  requestPresentationStyle: (style: PresentationStyle) => void;
  sendMessage: (layout: MessageLayout) => void;
  sendUpdate: (layout: MessageLayout, sessionId: string) => void;
  createSession: () => string | null;
  insertAttachment: (payload?: {
    filename?: string;
    contents?: string;
  }) => Promise<boolean>;
  getConversationInfo: () => ConversationInfo | null;
  addEventListener: (
    eventName: 'onPresentationStyleChange',
    listener: (style: PresentationStyle) => void
  ) => { remove: () => void };
}

export interface NonExtensionTarget extends BaseTarget {
  close?: undefined;
  openHostApp?: undefined;
  getSharedData?: undefined;
}

export interface SafariExtensionTarget extends BaseTarget {
  type: 'safari';
  closePopup: () => void;
  openTab: (url: string) => Promise<void>;
  copyToClipboard: (text: string) => Promise<boolean>;
}

export type Target =
  | ExtensionTarget
  | MessagesExtensionTarget
  | NonExtensionTarget
  | SafariExtensionTarget
  | WidgetFolderTarget
  | WidgetProductTarget;

function getProcessEnv(): Record<string, string | undefined> {
  const proc = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process;
  return proc?.env ?? {};
}

const EXTENSION_TYPES: Set<ReactNativeCompatibleType> = new Set([
  'share',
  'action',
  'clip',
  'messages',
  'notification-content',
]);

const WEB_EXTENSION_TYPES: Set<ExtensionType> = new Set(['safari']);

function isExtensionType(
  type: ExtensionType
): type is ReactNativeCompatibleType {
  return EXTENSION_TYPES.has(type as ReactNativeCompatibleType);
}

function isWebExtensionType(type: ExtensionType): boolean {
  return WEB_EXTENSION_TYPES.has(type);
}

function isWidgetType(type: ExtensionType): boolean {
  return type === 'widget' || type === 'watch-widget';
}

function shouldRefreshAfterSetData(
  widgetProduct: boolean,
  options?: SetDataOptions
): boolean {
  return widgetProduct ? options?.refresh !== false : options?.refresh === true;
}

function mirrorExpoUiSnapshot(
  targetName: string,
  data: Record<string, any>
): void {
  const widget = expoUiWidgets.get(targetName);
  if (widget && Platform.OS === 'ios') {
    widget.updateSnapshot(data);
  }
}

function reloadWidgetSurface(
  targetName: string,
  storage: AppGroupStorage
): void {
  storage.refresh(targetName);
  expoUiWidgets.get(targetName)?.reload();
}

function createBaseTarget(opts: {
  targetName: string;
  config: TargetConfig;
  appGroup: string;
  widgetProduct?: boolean;
}): BaseTarget {
  const {
    targetName,
    config,
    appGroup,
    widgetProduct: widgetProductOpt,
  } = opts;
  const storage = new AppGroupStorage(appGroup, targetName);
  const widgetProduct = widgetProductOpt ?? isWidgetType(config.type);
  return {
    name: targetName,
    type: config.type,
    appGroup,
    storage,
    config,
    setData(data: Record<string, any>, options?: SetDataOptions) {
      storage.setData(data);
      mirrorExpoUiSnapshot(targetName, data);
      if (shouldRefreshAfterSetData(widgetProduct, options)) {
        reloadWidgetSurface(targetName, storage);
      }
    },
    getData<T extends Record<string, any>>(): T {
      return storage.getData<T>();
    },
    refresh() {
      reloadWidgetSurface(targetName, storage);
    },
    setTimeline(entries: TimelineEntry[]) {
      const widget = expoUiWidgets.get(targetName);
      if (widget && Platform.OS === 'ios') {
        widget.updateTimeline(entries);
      }
      const latest = [...entries]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .at(-1);
      if (latest) {
        storage.setData(latest.props);
      }
    },
    async getTimeline<T extends Record<string, any> = Record<string, any>>() {
      const widget = expoUiWidgets.get(targetName);
      if (!(widget && Platform.OS === 'ios')) {
        return [];
      }
      return (await widget.getTimeline()) as TimelineEntry<T>[];
    },
  };
}

function createMessagesTarget(
  baseTarget: BaseTarget,
  extension: Extension,
  messages: Messages
): MessagesExtensionTarget {
  return {
    ...baseTarget,
    type: 'messages',
    openHostApp: (path?: string) => extension.openHostApp(path),
    getSharedData: () => extension.getSharedData(),
    getPresentationStyle: () => messages.getPresentationStyle(),
    requestPresentationStyle: (style: PresentationStyle) =>
      messages.requestPresentationStyle(style),
    sendMessage: (layout: MessageLayout) => messages.sendMessage(layout),
    sendUpdate: (layout: MessageLayout, sessionId: string) =>
      messages.sendUpdate(layout, sessionId),
    createSession: () => messages.createSession(),
    insertAttachment: (payload) => messages.insertAttachment(payload),
    getConversationInfo: () => messages.getConversationInfo(),
    addEventListener: (
      eventName: 'onPresentationStyleChange',
      listener: (style: PresentationStyle) => void
    ) => messages.addEventListener(eventName, listener),
  };
}

function createExtensionTarget(
  baseTarget: BaseTarget,
  type: ReactNativeCompatibleType,
  extension: Extension
): ExtensionTarget {
  return {
    ...baseTarget,
    type,
    close: () => extension.close(),
    openHostApp: (path?: string) => extension.openHostApp(path),
    getSharedData: () => extension.getSharedData(),
  };
}

function assertGalleryProduct(config: TargetConfig, kindName: string): void {
  const products = galleryProductNames(config);
  if (!products.includes(kindName)) {
    throw new Error(
      `[expo-targets] Unknown widget product "${kindName}" on folder "${config.name}". ` +
        `Configured: ${products.join(', ') || '(none)'}.`
    );
  }
}

function liveActivityHandleForConfig(
  config: TargetConfig,
  attributesName?: LiveActivityAttributesName
) {
  const configs = resolveLiveActivityConfigs(config);
  if (configs.length === 0) {
    throw new Error(
      `[expo-targets] Target "${config.name}" has no Live Activity configured. ` +
        'Add ios.liveActivity or ios.liveActivities to expo-target.config.json.'
    );
  }
  if (attributesName) {
    if (!configs.some((la) => la.attributesName === attributesName)) {
      throw new Error(
        `[expo-targets] Unknown Live Activity "${attributesName}" on target "${config.name}". ` +
          `Configured: ${configs.map((la) => la.attributesName).join(', ')}.`
      );
    }
    return buildLiveActivityHandle(attributesName);
  }
  if (configs.length === 1) {
    return buildLiveActivityHandle(
      configs[0]!.attributesName as LiveActivityAttributesName
    );
  }
  throw new Error(
    `[expo-targets] Target "${config.name}" has multiple Live Activities. ` +
      `Call .liveActivity('${configs[0]!.attributesName}') with attributesName. ` +
      `Configured: ${configs.map((la) => la.attributesName).join(', ')}.`
  );
}

function augmentOneToOneWidgetHandle(
  baseTarget: BaseTarget,
  config: TargetConfig
): WidgetProductTarget {
  return {
    ...baseTarget,
    widget(kindName: string, layout?: React.ComponentType<any>) {
      assertGalleryProduct(config, kindName);
      if (kindName === baseTarget.name) {
        if (layout) {
          registerTargetComponent(kindName, layout, baseTarget as Target);
        }
        return baseTarget;
      }
      return createWidgetProductHandle({
        config,
        productName: kindName,
        componentFunc: layout,
      });
    },
    liveActivity: (attributesName?: LiveActivityAttributesName) =>
      liveActivityHandleForConfig(config, attributesName),
  };
}

function createWidgetProductHandle(opts: {
  config: TargetConfig;
  productName: string;
  componentFunc?: React.ComponentType<any>;
  augmentOneToOne?: boolean;
}): BaseTarget | WidgetProductTarget {
  const { config, productName, componentFunc, augmentOneToOne } = opts;
  const appGroup = config.appGroup;
  if (!appGroup) {
    throw new Error(
      `App Group not configured for target "${config.name}". Add "appGroup" to your target config.`
    );
  }

  const baseTarget = createBaseTarget({
    targetName: productName,
    config,
    appGroup,
    widgetProduct: true,
  });
  const target = buildTargetFromConfig(baseTarget, config);

  if (componentFunc) {
    registerTargetComponent(productName, componentFunc, target);
  }

  if (augmentOneToOne && !isMultiProductWidgetFolder(config)) {
    return augmentOneToOneWidgetHandle(baseTarget, config);
  }

  return baseTarget;
}

function createWidgetFolderTarget(config: TargetConfig): WidgetFolderTarget {
  const appGroup = config.appGroup;
  if (!appGroup) {
    throw new Error(
      `App Group not configured for target "${config.name}". Add "appGroup" to your target config.`
    );
  }
  if (!isWidgetType(config.type)) {
    throw new Error(
      `[expo-targets] Internal error: folder handle requires widget type`
    );
  }

  const folderType = config.type as 'widget' | 'watch-widget';

  return {
    name: config.name,
    type: folderType,
    appGroup,
    config,
    widget(kindName: string, layout?: React.ComponentType<any>) {
      assertGalleryProduct(config, kindName);
      return createWidgetProductHandle({
        config,
        productName: kindName,
        componentFunc: layout,
      });
    },
    liveActivity: (attributesName?: LiveActivityAttributesName) =>
      liveActivityHandleForConfig(config, attributesName),
    setData(data: Record<string, any>, options?: SetDataOptions) {
      for (const product of galleryProductNames(config)) {
        createWidgetProductHandle({
          config,
          productName: product,
        }).setData(data, { refresh: false });
      }
      if (options?.refresh !== false) {
        const storage = new AppGroupStorage(appGroup, config.name);
        for (const product of galleryProductNames(config)) {
          storage.refresh(product);
          expoUiWidgets.get(product)?.reload();
        }
      }
    },
    refresh() {
      const storage = new AppGroupStorage(appGroup, config.name);
      for (const product of galleryProductNames(config)) {
        storage.refresh(product);
        expoUiWidgets.get(product)?.reload();
      }
    },
  };
}

function createProductTargetFromConfig(
  config: TargetConfig,
  productName: string,
  componentFunc?: React.ComponentType<any>
): Target {
  if (isWidgetType(config.type)) {
    const augmentOneToOne =
      productName === config.name && !isMultiProductWidgetFolder(config);
    return createWidgetProductHandle({
      config,
      productName,
      componentFunc,
      augmentOneToOne,
    });
  }

  const appGroup = config.appGroup;
  if (!appGroup) {
    throw new Error(
      `App Group not configured for target "${productName}". Add "appGroup" to your target config.`
    );
  }

  const safariTarget = tryCreateSafariTargetFromConfig(
    productName,
    config,
    componentFunc
  );
  if (safariTarget) {
    return safariTarget;
  }

  const baseTarget = createBaseTarget({
    targetName: productName,
    config,
    appGroup,
    widgetProduct: false,
  });
  const target = buildTargetFromConfig(baseTarget, config);

  if (componentFunc) {
    registerTargetComponent(productName, componentFunc, target);
  }

  return target;
}

function buildTargetFromConfig(
  baseTarget: BaseTarget,
  config: TargetConfig
): Target {
  if (!isExtensionType(config.type)) {
    const nonExtensionTarget: NonExtensionTarget = {
      ...baseTarget,
      close: undefined,
      openHostApp: undefined,
      getSharedData: undefined,
    };
    return nonExtensionTarget;
  }

  const extension = new Extension();
  if (config.type === 'messages') {
    return createMessagesTarget(baseTarget, extension, new Messages());
  }

  return createExtensionTarget(baseTarget, config.type, extension);
}

function wrapWithDevToolsIfNeeded(
  component: React.ComponentType<any>
): React.ComponentType<any> {
  if (getProcessEnv().NODE_ENV === 'production') {
    return component;
  }

  try {
    const { withDevTools } = require('expo/src/launch/withDevTools');
    return withDevTools(component);
  } catch {
    return component;
  }
}

function registerExpoUiWidget(
  targetName: string,
  layout: React.ComponentType<any> | ((...args: any[]) => any)
): void {
  try {
    // Private dep — layout must use the `'widget'` directive (babel → layout string).
    const { createWidget } = require('expo-widgets') as {
      createWidget: (
        name: string,
        layout: unknown,
        initialProps?: Record<string, any>
      ) => ExpoUiWidgetHandle;
    };
    const widget = createWidget(targetName, layout);
    expoUiWidgets.set(targetName, widget);
  } catch (error) {
    throw new Error(
      `[expo-targets] createTarget("${targetName}", Layout) for expo-ui widgets requires ` +
        `expo-widgets (private dependency). Ensure the Layout uses the 'widget' directive. ` +
        `Underlying error: ${error}`
    );
  }
}

function registerTargetComponent(
  targetName: string,
  componentFunc: React.ComponentType<any>,
  target: Target
): void {
  const config = target.config;
  if (!('entry' in config && config.entry)) {
    throw new Error(
      `[expo-targets] createTarget("${targetName}", Component) requires an "entry" field in ` +
        'expo-target.config pointing at the RN entry file (relative to project root). ' +
        'See docs/react-native-extensions.md'
    );
  }

  const uiMode = resolveUiMode({
    type: config.type,
    entry: config.entry,
    ui: (config as { ui?: 'native' | 'expo-ui' | 'react-native' }).ui,
  });

  if (
    uiMode === 'expo-ui' &&
    (config.type === 'widget' || config.type === 'watch-widget')
  ) {
    registerExpoUiWidget(targetName, componentFunc);
    return;
  }

  const WrappedComponent = (props: any) => {
    const React = require('react');
    return React.createElement(componentFunc, { ...props, target });
  };

  const qualifiedComponent = wrapWithDevToolsIfNeeded(WrappedComponent);
  AppRegistry.registerComponent(targetName, () => qualifiedComponent);
}

function tryCreateSafariTargetFromConfig(
  targetName: string,
  config: TargetConfig,
  componentFunc?: React.ComponentType<any>
): SafariExtensionTarget | null {
  if (
    !(
      isWebExtensionType(config.type) &&
      componentFunc &&
      'entry' in config &&
      config.entry
    )
  ) {
    return null;
  }

  bootstrapSafariExtension(targetName, componentFunc);
  return createSafariTargetFromConfig(targetName, config);
}

// Function overloads for better type inference
export function createTarget(
  targetName: MultiProductWidgetFolderName,
  componentFunc?: undefined
): WidgetFolderTarget;
export function createTarget<_T extends 'messages'>(
  targetName: TargetName | WidgetKindName,
  componentFunc?: React.ComponentType<any>
): MessagesExtensionTarget;
export function createTarget<_T extends 'safari'>(
  targetName: TargetName | WidgetKindName,
  componentFunc?: React.ComponentType<any>
): SafariExtensionTarget;
export function createTarget<
  _T extends Exclude<ReactNativeCompatibleType, 'messages'>,
>(
  targetName: TargetName | WidgetKindName,
  componentFunc?: React.ComponentType<any>
): ExtensionTarget;
export function createTarget<
  _T extends Exclude<ExtensionType, ReactNativeCompatibleType>,
>(
  targetName: TargetName | WidgetKindName,
  componentFunc?: React.ComponentType<any>
): NonExtensionTarget | WidgetFolderTarget;
export function createTarget(
  targetName: TargetName | WidgetKindName,
  componentFunc?: React.ComponentType<any>
): Target;
export function createTarget<_T extends ExtensionType = ExtensionType>(
  targetName: TargetName | WidgetKindName,
  componentFunc?: React.ComponentType<any>
): Target {
  if (isSafariExtension() && componentFunc) {
    return createSafariTarget(targetName, componentFunc);
  }

  const targets = listTargets();
  const resolved = resolveHostProduct(targetName, targets);
  if (!resolved) {
    throw new Error(formatUnknownHostProductError(targetName, targets));
  }

  const { config, productName, role } = resolved;

  if (role === 'folder' && isMultiProductWidgetFolder(config)) {
    if (componentFunc) {
      throw new Error(
        `[expo-targets] createTarget("${targetName}", Layout) on a multi-product widget folder ` +
          `requires .widget('KindName', Layout).`
      );
    }
    return createWidgetFolderTarget(config);
  }

  return createProductTargetFromConfig(config, productName, componentFunc);
}

function createWebStorage(targetName: string) {
  return {
    setData: async (data: Record<string, any>) => {
      try {
        const api = (window as any).browser || (window as any).chrome;
        if (api?.storage?.local?.set) {
          await api.storage.local.set({ [targetName]: data });
        }
      } catch {}
    },
    getData: <T extends Record<string, any>>(): T => ({}) as T,
    refresh: () => {},
  };
}

/**
 * Create a Safari extension target when running in web context
 * This is called when isSafariExtension() returns true
 */
function createSafariTarget(
  targetName: string,
  componentFunc: React.ComponentType<any>
): SafariExtensionTarget {
  bootstrapSafariExtension(targetName, componentFunc);

  const webStorage = createWebStorage(targetName);

  return {
    name: targetName,
    type: 'safari',
    appGroup: '',
    storage: webStorage as any,
    config: { type: 'safari', name: targetName, platforms: ['ios'] },
    setData: webStorage.setData as any,
    getData: webStorage.getData,
    refresh: webStorage.refresh,
    setTimeline: () => {},
    getTimeline: async () => [],
    closePopup,
    openTab,
    copyToClipboard,
  };
}

/**
 * Create a Safari target from config (fallback when config is available)
 */
function createSafariTargetFromConfig(
  targetName: string,
  config: TargetConfig
): SafariExtensionTarget {
  const webStorage = createWebStorage(targetName);

  return {
    name: targetName,
    type: 'safari',
    appGroup: config.appGroup || '',
    storage: webStorage as any,
    config,
    setData: webStorage.setData as any,
    getData: webStorage.getData,
    refresh: webStorage.refresh,
    setTimeline: () => {},
    getTimeline: async () => [],
    closePopup,
    openTab,
    copyToClipboard,
  };
}
