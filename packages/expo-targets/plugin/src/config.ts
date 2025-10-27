import type { ExpoConfig } from '@expo/config-types';

export type ExtensionType =
  | 'widget'
  | 'clip'
  | 'stickers'
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

export interface StickerPack {
  name: string;
  assets: string[];
}

export const TYPE_MINIMUM_DEPLOYMENT_TARGETS: Record<ExtensionType, string> = {
  widget: '14.0',
  clip: '14.0',
  stickers: '10.0',
  share: '8.0',
  action: '8.0',
  'notification-content': '10.0',
  'notification-service': '10.0',
  intent: '12.0',
  'intent-ui': '12.0',
  safari: '15.0',
  spotlight: '9.0',
  'bg-download': '7.0',
  'quicklook-thumbnail': '11.0',
  'location-push': '15.0',
  'credentials-provider': '12.0',
  'account-auth': '12.2',
  'app-intent': '16.0',
  'device-activity-monitor': '15.0',
  matter: '16.1',
  watch: '2.0',
};

export const TYPE_BUNDLE_IDENTIFIER_SUFFIXES: Record<ExtensionType, string> = {
  widget: 'widget',
  clip: 'clip',
  stickers: 'stickers',
  share: 'share',
  action: 'action',
  safari: 'safari',
  'notification-content': 'notification-content',
  'notification-service': 'notification-service',
  intent: 'intent',
  'intent-ui': 'intent-ui',
  spotlight: 'spotlight',
  'bg-download': 'bg-download',
  'quicklook-thumbnail': 'quicklook-thumbnail',
  'location-push': 'location-push',
  'credentials-provider': 'credentials-provider',
  'account-auth': 'account-auth',
  'app-intent': 'app-intent',
  'device-activity-monitor': 'device-activity-monitor',
  matter: 'matter',
  watch: 'watch',
};

// Base configuration shared by all iOS targets
interface BaseIOSTargetConfig {
  icon?: string;
  deploymentTarget?: string;
  bundleIdentifier?: string;
  displayName?: string;
  colors?: Record<string, string | Color>;
  images?: Record<string, string>;
  stickerPacks?: StickerPack[];
  frameworks?: string[];
  entitlements?: Record<string, any>;
  infoPlist?: Record<string, any>;

  // CamelCase build settings
  swiftVersion?: string;
  targetedDeviceFamily?: string;
  clangEnableModules?: boolean | string;
  swiftEmitLocStrings?: boolean | string;
}

// Types that support React Native rendering
export type ReactNativeCompatibleType = 'share' | 'action' | 'clip';

// Types that do NOT support React Native (use native rendering)
export type NativeOnlyType = Exclude<ExtensionType, ReactNativeCompatibleType>;

// Config for React Native compatible types
export interface IOSTargetConfigWithReactNative extends BaseIOSTargetConfig {
  useReactNative?: boolean;
  excludedPackages?: string[];
}

// Config for native-only types (no React Native options)
export interface IOSTargetConfigNativeOnly extends BaseIOSTargetConfig {
  useReactNative?: never;
  excludedPackages?: never;
}

// Union type based on target type
export type IOSTargetConfig =
  | IOSTargetConfigWithReactNative
  | IOSTargetConfigNativeOnly;

export interface AndroidTargetConfig {
  resourceName?: string;
}

// Base config shared by all targets
type BaseTargetConfig = {
  name: string;
  displayName?: string;
  appGroup?: string;
  platforms: string[];
  android?: AndroidTargetConfig;
};

// Target config for React Native compatible types
type TargetConfigReactNativeCompatible = BaseTargetConfig & {
  type: ReactNativeCompatibleType;
  ios?: IOSTargetConfigWithReactNative;
};

// Target config for native-only types
type TargetConfigNativeOnly = BaseTargetConfig & {
  type: NativeOnlyType;
  ios?: IOSTargetConfigNativeOnly;
};

// Main discriminated union
export type TargetConfig =
  | TargetConfigReactNativeCompatible
  | TargetConfigNativeOnly;

export type TargetConfigFunction = (config: ExpoConfig) => TargetConfig;

export const getAppGroup = (identifier: string) => `group.${identifier}`;
export const getTargetBundleIdentifier = (
  appBundleId: string,
  targetName: string
) => `${appBundleId}.${targetName}`;
