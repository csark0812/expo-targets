import Constants from 'expo-constants';
import { AppRegistry, Platform } from 'react-native';
import type {
  ExtensionType,
  ReactNativeCompatibleType,
  TargetConfig,
} from '../plugin/src/config';
import { resolveUiMode } from '../plugin/src/domain/uiMode';
import type { TargetName } from './generatedNames';
import { Extension, type SharedData } from './modules/extension/index';
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
import {
  AppGroupStorage,
  getTargetsConfigFromBundle,
} from './modules/storage/index';

export type SetDataOptions = {
  /** When true, reload WidgetKit timelines after writing (widgets). Default false. */
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
  getTimeline: <T extends Record<string, any> = Record<string, any>>() => Promise<
    TimelineEntry<T>[]
  >;
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
  | SafariExtensionTarget;

function getProcessEnv(): Record<string, string | undefined> {
  const proc = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process;
  return proc?.env ?? {};
}

function getTargetConfig(targetName: string): TargetConfig | null {
  const expoConfig = Constants.expoConfig;

  // Try expo config first (works in main app)
  let targets = (expoConfig?.extra?.targets as TargetConfig[]) || [];

  // Fallback to Info.plist for extensions
  if (targets.length === 0) {
    const bundleTargets = getTargetsConfigFromBundle();
    if (bundleTargets) {
      targets = bundleTargets as TargetConfig[];
    } else {
      return null;
    }
  }

  const target = targets.find((t) => t.name === targetName);

  if (!target) {
    return null;
  }

  return target;
}

function getTargetAppGroup(
  targetName: string,
  config?: TargetConfig
): string | null {
  const targetConfig = config || getTargetConfig(targetName);
  if (!targetConfig) {
    return null;
  }

  return targetConfig.appGroup || null;
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

function createBaseTarget(
  targetName: string,
  config: TargetConfig,
  appGroup: string
): BaseTarget {
  const storage = new AppGroupStorage(appGroup, targetName);
  return {
    name: targetName,
    type: config.type,
    appGroup,
    storage,
    config,
    setData(data: Record<string, any>, options?: SetDataOptions) {
      // Always mirror into App Group storage (Android Glance + native deepen).
      storage.setData(data);
      const widget = expoUiWidgets.get(targetName);
      if (widget && Platform.OS === 'ios') {
        // One-entry timeline blob (= expo-widgets updateSnapshot).
        widget.updateSnapshot(data);
      }
      if (options?.refresh) {
        storage.refresh(targetName);
        widget?.reload();
      }
    },
    getData<T extends Record<string, any>>(): T {
      return storage.getData<T>();
    },
    refresh() {
      storage.refresh(targetName);
      expoUiWidgets.get(targetName)?.reload();
    },
    setTimeline(entries: TimelineEntry[]) {
      const widget = expoUiWidgets.get(targetName);
      if (widget && Platform.OS === 'ios') {
        widget.updateTimeline(entries);
      }
      const latest = [...entries].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      ).at(-1);
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
export function createTarget<_T extends 'messages'>(
  targetName: TargetName,
  componentFunc?: React.ComponentType<any>
): MessagesExtensionTarget;
export function createTarget<_T extends 'safari'>(
  targetName: TargetName,
  componentFunc?: React.ComponentType<any>
): SafariExtensionTarget;
export function createTarget<
  _T extends Exclude<ReactNativeCompatibleType, 'messages'>,
>(
  targetName: TargetName,
  componentFunc?: React.ComponentType<any>
): ExtensionTarget;
export function createTarget<
  _T extends Exclude<ExtensionType, ReactNativeCompatibleType>,
>(
  targetName: TargetName,
  componentFunc?: React.ComponentType<any>
): NonExtensionTarget;
export function createTarget(
  targetName: TargetName,
  componentFunc?: React.ComponentType<any>
): Target;
export function createTarget<_T extends ExtensionType = ExtensionType>(
  targetName: TargetName,
  componentFunc?: React.ComponentType<any>
): Target {
  if (isSafariExtension() && componentFunc) {
    return createSafariTarget(targetName, componentFunc);
  }

  const config = getTargetConfig(targetName);
  if (!config) {
    throw new Error(
      `Target "${targetName}" not found. Ensure it's defined in app.json under "extra.targets"`
    );
  }

  const safariTarget = tryCreateSafariTargetFromConfig(
    targetName,
    config,
    componentFunc
  );
  if (safariTarget) {
    return safariTarget;
  }

  const appGroup = getTargetAppGroup(targetName, config);
  if (!appGroup) {
    throw new Error(
      `App Group not configured for target "${targetName}". Add "appGroup" to your target config.`
    );
  }

  const baseTarget = createBaseTarget(targetName, config, appGroup);
  const target = buildTargetFromConfig(baseTarget, config);

  if (componentFunc) {
    registerTargetComponent(targetName, componentFunc, target);
  }

  return target;
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
