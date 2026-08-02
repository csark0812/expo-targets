import Constants from 'expo-constants';
import { AppRegistry } from 'react-native';
import type {
  ExtensionType,
  ReactNativeCompatibleType,
  TargetConfig,
} from '../plugin/src/config';
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

export interface BaseTarget {
  name: string;
  type: ExtensionType;
  appGroup: string;
  storage: AppGroupStorage;
  config: TargetConfig;
  setData: (data: Record<string, any>) => void;
  getData: <T extends Record<string, any>>() => T;
  refresh: () => void;
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

// Function overloads for better type inference
export function createTarget<_T extends 'messages'>(
  targetName: string,
  componentFunc?: React.ComponentType<any>
): MessagesExtensionTarget;
export function createTarget<_T extends 'safari'>(
  targetName: string,
  componentFunc?: React.ComponentType<any>
): SafariExtensionTarget;
export function createTarget<
  _T extends Exclude<ReactNativeCompatibleType, 'messages'>,
>(
  targetName: string,
  componentFunc?: React.ComponentType<any>
): ExtensionTarget;
export function createTarget<
  _T extends Exclude<ExtensionType, ReactNativeCompatibleType>,
>(
  targetName: string,
  componentFunc?: React.ComponentType<any>
): NonExtensionTarget;
export function createTarget(
  targetName: string,
  componentFunc?: React.ComponentType<any>
): Target;
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity; tracked for refactor
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing complexity; tracked for refactor
export function createTarget<_T extends ExtensionType = ExtensionType>(
  targetName: string,
  componentFunc?: React.ComponentType<any>
): Target {
  // Safari web extension: runs in browser context, use web rendering
  if (isSafariExtension() && componentFunc) {
    return createSafariTarget(targetName, componentFunc);
  }

  const config = getTargetConfig(targetName);
  if (!config) {
    throw new Error(
      `Target "${targetName}" not found. Ensure it's defined in app.json under "extra.targets"`
    );
  }

  // Safari extension with entry but running in native context (config lookup)
  // This shouldn't normally happen but handle gracefully
  if (
    isWebExtensionType(config.type) &&
    componentFunc &&
    'entry' in config &&
    config.entry
  ) {
    // Safari extensions with entry should bootstrap for web
    bootstrapSafariExtension(targetName, componentFunc);
    return createSafariTargetFromConfig(targetName, config);
  }

  const appGroup = getTargetAppGroup(targetName, config);
  if (!appGroup) {
    throw new Error(
      `App Group not configured for target "${targetName}". Add "appGroup" to your target config.`
    );
  }

  // Build target object first so we can pass it to the component
  const storage = new AppGroupStorage(appGroup, targetName);
  const baseTarget: BaseTarget = {
    name: targetName,
    type: config.type,
    appGroup,
    storage,
    config,
    setData(data: Record<string, any>) {
      storage.setData(data);
    },
    getData<T extends Record<string, any>>(): T {
      return storage.getData<T>();
    },
    refresh() {
      storage.refresh(targetName);
    },
  };

  let target: Target;

  if (isExtensionType(config.type)) {
    const extension = new Extension();

    if (config.type === 'messages') {
      const messages = new Messages();
      const messagesTarget: MessagesExtensionTarget = {
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
        getConversationInfo: () => messages.getConversationInfo(),
        addEventListener: (
          eventName: 'onPresentationStyleChange',
          listener: (style: PresentationStyle) => void
        ) => messages.addEventListener(eventName, listener),
      };
      target = messagesTarget as any;
    } else {
      const extensionTarget: ExtensionTarget = {
        ...baseTarget,
        type: config.type as ReactNativeCompatibleType,
        close: () => extension.close(),
        openHostApp: (path?: string) => extension.openHostApp(path),
        getSharedData: () => extension.getSharedData(),
      };
      target = extensionTarget as any;
    }
  } else {
    const nonExtensionTarget: NonExtensionTarget = {
      ...baseTarget,
      close: undefined,
      openHostApp: undefined,
      getSharedData: undefined,
    };
    target = nonExtensionTarget as any;
  }

  // Register component with target injected as prop
  if (componentFunc) {
    if (!('entry' in config && config.entry)) {
      throw new Error(
        `[expo-targets] createTarget("${targetName}", Component) requires an "entry" field in ` +
          'expo-target.config pointing at the RN entry file (relative to project root). ' +
          'See docs/react-native-extensions.md'
      );
    }

    const WrappedComponent = (props: any) => {
      const React = require('react');
      return React.createElement(componentFunc, { ...props, target });
    };

    let qualifiedComponent = WrappedComponent;

    // Avoid `node:process` so Metro/Release host bundles resolve in RN.
    // biome-ignore lint/correctness/noProcessGlobal: RN host env; node:process breaks Metro
    if (globalThis.process?.env?.NODE_ENV !== 'production') {
      try {
        const { withDevTools } = require('expo/src/launch/withDevTools');
        qualifiedComponent = withDevTools(WrappedComponent);
      } catch {}
    }

    AppRegistry.registerComponent(targetName, () => qualifiedComponent);
  }

  return target;
}

/**
 * Create a Safari extension target when running in web context
 * This is called when isSafariExtension() returns true
 */
function createSafariTarget(
  targetName: string,
  componentFunc: React.ComponentType<any>
): SafariExtensionTarget {
  // Bootstrap the React component for web rendering
  bootstrapSafariExtension(targetName, componentFunc);

  // Create a web-based storage adapter using browser.storage
  const webStorage = {
    setData: async (data: Record<string, any>) => {
      try {
        const api = (window as any).browser || (window as any).chrome;
        if (api?.storage?.local?.set) {
          await api.storage.local.set({ [targetName]: data });
        }
      } catch {}
    },
    getData: <T extends Record<string, any>>(): T => {
      // Sync get isn't possible with browser.storage, return empty
      // Use useBrowserStorage hook for async access
      return {} as T;
    },
    refresh: () => {
      // No-op for web storage
    },
  };

  const safariTarget: SafariExtensionTarget = {
    name: targetName,
    type: 'safari',
    appGroup: '', // Not applicable for Safari extensions
    storage: webStorage as any, // Web storage adapter
    config: { type: 'safari', name: targetName, platforms: ['ios'] },
    setData: webStorage.setData as any,
    getData: webStorage.getData,
    refresh: webStorage.refresh,
    closePopup,
    openTab,
    copyToClipboard,
  };

  return safariTarget;
}

/**
 * Create a Safari target from config (fallback when config is available)
 */
function createSafariTargetFromConfig(
  targetName: string,
  config: TargetConfig
): SafariExtensionTarget {
  const webStorage = {
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

  return {
    name: targetName,
    type: 'safari',
    appGroup: config.appGroup || '',
    storage: webStorage as any,
    config,
    setData: webStorage.setData as any,
    getData: webStorage.getData,
    refresh: webStorage.refresh,
    closePopup,
    openTab,
    copyToClipboard,
  };
}
