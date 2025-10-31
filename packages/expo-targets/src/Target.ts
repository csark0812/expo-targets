import Constants from 'expo-constants';
import { AppRegistry, ComponentProvider } from 'react-native';

import { Extension, type SharedData } from './modules/extension';
import { AppGroupStorage, getTargetsConfigFromBundle } from './modules/storage';
import type {
  TargetConfig,
  ExtensionType,
  ReactNativeCompatibleType,
} from '../plugin/src/config';

export interface Target {
  name: string;
  type: ExtensionType;
  appGroup: string;
  storage: AppGroupStorage;
  config: TargetConfig;
  setData(data: Record<string, any>): void;
  getData<T extends Record<string, any>>(): T;
  refresh(): void;
  close?: () => void;
  openHostApp?: (path?: string) => void;
  getSharedData?: () => SharedData | null;
}

function getTargetConfig(targetName: string): TargetConfig | null {
  const expoConfig = Constants.expoConfig;

  // Try expo config first (works in main app)
  let targets = (expoConfig?.extra?.targets as TargetConfig[]) || [];

  // Fallback to Info.plist for extensions
  if (targets.length === 0) {
    const bundleTargets = getTargetsConfigFromBundle();
    if (bundleTargets) {
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
export function createTarget(
  targetName: string,
  componentFunc?: React.ComponentType<any>
): Target {
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

  const appGroup = getTargetAppGroup(targetName, config);
  if (!appGroup) {
    throw new Error(
      `App Group not configured for target "${targetName}". Add "appGroup" to your target config.`
    );
  }

  const storage = new AppGroupStorage(appGroup);
  const target: Target = {
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

  if (isExtensionType(config.type)) {
    const extension = new Extension();
    target.close = () => extension.close();
    target.openHostApp = (path?: string) => extension.openHostApp(path);
    target.getSharedData = () => extension.getSharedData();
  }

  return target;
}
