import Constants from 'expo-constants';
import { AppRegistry, ComponentProvider } from 'react-native';
import { Platform } from 'react-native';

import { Extension, type SharedData } from './modules/extension';
import { AppGroupStorage, getTargetsConfigFromBundle } from './modules/storage';
import type {
  TargetConfig,
  ExtensionType,
  ReactNativeCompatibleType,
} from '../plugin/src/config';

export interface BaseTarget {
  name: string;
  type: ExtensionType;
  appGroup: string;
  storage: AppGroupStorage;
  config: TargetConfig;
  setData(data: Record<string, any>): Promise<void>;
  getData<T extends Record<string, any>>(): Promise<T>;
  refresh(): Promise<void>;
}

export interface ExtensionTarget extends BaseTarget {
  type: ReactNativeCompatibleType;
  close: () => void;
  openHostApp: (path?: string) => void;
  getSharedData: () => SharedData | null;
}

export interface NonExtensionTarget extends BaseTarget {
  close?: undefined;
  openHostApp?: undefined;
  getSharedData?: undefined;
}

export type Target = ExtensionTarget | NonExtensionTarget;

function getTargetConfig(targetName: string): TargetConfig | null {
  const expoConfig = Constants.expoConfig;

  // Try expo config first (works in main app)
  let targets = (expoConfig?.extra?.targets as TargetConfig[]) || [];

  // Fallback to Info.plist for extensions
  if (targets.length === 0) {
    // Note: getTargetsConfigFromBundle is async but we can't make this function async
    // So we'll handle it synchronously - iOS native module supports sync calls
    try {
    const bundleTargets = getTargetsConfigFromBundle();
      if (bundleTargets && Array.isArray(bundleTargets)) {
      console.log(
        '[expo-targets] Loaded targets config from bundle Info.plist'
      );
      targets = bundleTargets as TargetConfig[];
    } else {
      console.warn(
        '[expo-targets] No targets config found in expo config or bundle'
        );
        return null;
      }
    } catch (error) {
      console.warn(
        '[expo-targets] Failed to load targets config from bundle:',
        error
      );
      return null;
    }
  }

  const target = targets.find((t) => t.name === targetName);

  if (!target) {
    console.warn(`[expo-targets] Target "${targetName}" not found`);
    console.warn(
      `[expo-targets] Available targets: ${targets.map((t) => t.name).join(', ')}`
    );
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
]);

function isExtensionType(
  type: ExtensionType
): type is ReactNativeCompatibleType {
  return EXTENSION_TYPES.has(type as ReactNativeCompatibleType);
}
export function createTarget<T extends ExtensionType = ExtensionType>(
  targetName: string,
  componentFunc?: React.ComponentType<any>
): T extends ReactNativeCompatibleType ? ExtensionTarget : Target {
  const config = getTargetConfig(targetName);
  if (!config) {
    throw new Error(
      `Target "${targetName}" not found. Ensure it's defined in app.json under "extra.targets"`
    );
  }

  if (componentFunc && 'entry' in config && config.entry) {
    let qualifiedComponent = componentFunc;

    if (process.env.NODE_ENV !== 'production') {
      try {
        const { withDevTools } = require('expo/src/launch/withDevTools');
        qualifiedComponent = withDevTools(componentFunc);
      } catch (error) {
        console.warn(
          '[expo-targets] Could not load withDevTools, using component as-is'
        );
      }
    }

    AppRegistry.registerComponent(
      targetName + 'Target',
      () => qualifiedComponent
    );
  }

  // For Android widgets, use target name as storage key if appGroup not provided
  // For iOS, appGroup is required
  let appGroup = getTargetAppGroup(targetName, config);
  if (!appGroup && Platform.OS === 'android' && config.type === 'widget') {
    appGroup = targetName; // Use target name as storage key for Android widgets
  }
  if (!appGroup) {
    throw new Error(
      `App Group not configured for target "${targetName}". Add "appGroup" to your target config.`
    );
  }

  const storage = new AppGroupStorage(appGroup);
  const baseTarget: BaseTarget = {
    name: targetName,
    type: config.type,
    appGroup,
    storage,
    config,
    async setData(data: Record<string, any>): Promise<void> {
      await storage.setData(data);
    },
    async getData<T extends Record<string, any>>(): Promise<T> {
      return await storage.getData<T>();
    },
    async refresh(): Promise<void> {
      await storage.refresh(targetName);
    },
  };

  if (isExtensionType(config.type)) {
    const extension = new Extension();
    const extensionTarget: ExtensionTarget = {
      ...baseTarget,
      type: config.type as ReactNativeCompatibleType,
      close: () => extension.close(),
      openHostApp: (path?: string) => extension.openHostApp(path),
      getSharedData: () => extension.getSharedData(),
    };
    return extensionTarget as any;
  }

  const nonExtensionTarget: NonExtensionTarget = {
    ...baseTarget,
    close: undefined,
    openHostApp: undefined,
    getSharedData: undefined,
  };
  return nonExtensionTarget as any;
}
