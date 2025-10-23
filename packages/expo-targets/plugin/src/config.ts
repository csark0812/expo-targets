import type { ExpoConfig } from '@expo/config-types';

export type ExtensionType =
  | 'widget'
  | 'clip'
  | 'imessage'
  | 'share'
  | 'action'
  | 'safari'
  | 'notification-content'
  | 'notification-service'
  | 'intent'
  | 'intent-ui'
  | 'spotlight'
  | 'bg-download'
  | 'quicklook-thumbnail'
  | 'location-push'
  | 'credentials-provider'
  | 'account-auth'
  | 'app-intent'
  | 'device-activity-monitor'
  | 'matter'
  | 'watch';

export interface Color {
  light?: string;
  dark?: string;
  color?: string;
  darkColor?: string;
}

export interface IOSTargetConfig {
  icon?: string;
  deploymentTarget?: string;
  bundleIdentifier?: string;
  displayName?: string;
  colors?: Record<string, string | Color>;
  images?: Record<string, string>;
  frameworks?: string[];
  entitlements?: Record<string, any>;
  buildSettings?: Record<string, string>;
  useReactNative?: boolean;
  excludedPackages?: string[];
}

export interface AndroidTargetConfig {
  resourceName?: string;
}

export interface TargetConfig {
  type: ExtensionType;
  name?: string;
  displayName?: string;
  appGroup?: string;
  platforms: {
    ios?: IOSTargetConfig;
    android?: AndroidTargetConfig;
  };
}

export type TargetConfigFunction = (config: ExpoConfig) => TargetConfig;

export const getAppGroup = (identifier: string) => `group.${identifier}`;
export const getTargetBundleIdentifier = (
  appBundleId: string,
  targetName: string
) => `${appBundleId}.${targetName}`;
