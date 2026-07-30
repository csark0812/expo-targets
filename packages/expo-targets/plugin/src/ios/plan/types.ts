import type { ExpoConfig } from '@expo/config-types';

import type {
  ExtensionType,
  IOSTargetConfigWithReactNative,
} from '../../config';
import type { Logger } from '../../logger';
import type { TargetWorkspace } from '../observe/workspace';

/**
 * Resolved props for a single iOS target, as produced by `withIOSTarget`.
 */
export interface IOSTargetProps extends IOSTargetConfigWithReactNative {
  type: ExtensionType;
  name: string;
  entry?: string;
  excludedPackages?: string[];
  directory: string;
  configPath: string;
  logger: Logger;
  intents?: {
    intentsSupported?: string[];
    intentsRestrictedWhileLocked?: string[];
  };
  buildSubdirectory?: string;
}

/**
 * Project-level paths a plan is resolved against.
 */
export interface ProjectPaths {
  projectRoot: string;
  platformProjectRoot: string;
}

/** Names and identifiers a target is known by. */
export interface TargetIdentity {
  type: ExtensionType;
  name: string;
  displayName?: string;
  /** User-facing name (display name when set). */
  targetName: string;
  /** Sanitized Xcode product name, e.g. `MyShareTarget`. */
  targetProductName: string;
  mainBundleIdentifier: string;
  bundleIdentifier: string;
  deploymentTarget: string;
  productType: string;
  targetType: 'application' | 'app_extension';
  frameworks: string[];
}

/** A Swift file the plugin generates, plus the data its template needs. */
export type SwiftTemplatePlan =
  | {
      template: 'reactNativeViewController';
      options: {
        type: ExtensionType;
        moduleName: string;
        targetName: string;
        preprocessingFile?: string;
        entry?: string;
      };
    }
  | { template: 'messagesViewController' }
  | {
      template: 'safariWebExtensionHandler';
      options: { targetName: string };
    };

/** One Swift file that should end up in the target's Sources phase. */
export interface SwiftFilePlan {
  /** File name as referenced in Xcode (may be a nested relative path). */
  file: string;
  /** Absolute path of the file to reference. */
  sourcePath: string;
  /** Path stored in the PBX file reference, relative to `ios/`. */
  referencePath: string;
  /** Set when the file has to be generated before it can be referenced. */
  generate?: SwiftTemplatePlan;
}

export interface ColorsetPlan {
  name: string;
  colorsetPath: string;
  color: string;
  darkColor?: string;
}

export interface StickerAssetPlan {
  sourcePath: string;
  filename: string;
  stickerPath: string;
}

export interface StickerPackPlan {
  name: string;
  stickerPackPath: string;
  assets: StickerAssetPlan[];
  missingAssets: string[];
}

export interface StickersPlan {
  assetsPath: string;
  iconsetPath: string;
  sourceIconPath?: string;
  packs: StickerPackPlan[];
}

export interface AssetPlan {
  isStickers: boolean;
  buildAssetsPath: string;
  /** Path stored in the PBX file reference, relative to `ios/`. */
  referencePath: string;
  userAssetsPath: string;
  copyUserAssets: boolean;
  colorsets: ColorsetPlan[];
  stickers?: StickersPlan;
}

export interface SafariResourcesPlan {
  resourcesPath: string;
  useCustomResources: boolean;
  userResourcesPath: string;
  name: string;
  displayName?: string;
  manifest?: Record<string, any>;
}

export interface InfoPlistPlan {
  path: string;
  /** Path stored in the `INFOPLIST_FILE` build setting, relative to `ios/`. */
  referencePath: string;
  contents: string;
  mainAppSchemes: string[];
  embeddedTargetCount: number;
}

export interface EntitlementsPlan {
  required: boolean;
  path: string;
  entitlements: Record<string, any>;
  syncedAppGroups: boolean;
}

export interface EmbedPlan {
  kind: 'foundation-extension' | 'app-clip' | 'none';
}

export interface PodfilePlan {
  targetName: string;
  deploymentTarget: string;
  extensionType: ExtensionType;
  standalone: boolean;
  excludedPackages?: string[];
  podsRbContent?: string;
}

/**
 * The full description of one iOS target: what to write, what to change in the
 * Xcode project, and nothing about how to do it.
 */
export interface XcodeTargetPlan {
  identity: TargetIdentity;
  workspace: TargetWorkspace;
  requiresCode: boolean;
  requiresEntitlements: boolean;
  buildSettings: Record<string, string | string[]>;
  infoPlist: InfoPlistPlan;
  swiftFiles: SwiftFilePlan[];
  assets: AssetPlan;
  safari?: SafariResourcesPlan;
  embed: EmbedPlan;
}

/** Inputs every planner shares. */
export interface TargetPlanInput {
  props: IOSTargetProps;
  expoConfig: Partial<ExpoConfig> & { extra?: Record<string, any> };
  workspace: TargetWorkspace;
  paths: ProjectPaths;
  mainBuildSettings: Record<string, any>;
}
