import path from 'node:path';
import process from 'node:process';
import type { ExpoConfig } from '@expo/config-types';

import { TYPE_CHARACTERISTICS } from '../../domain';
import * as Paths from '../utils/paths';
import type {
  IOSTargetProps,
  ProjectPaths,
  TargetIdentity,
  TargetPlanInput,
} from './types';

const FALLBACK_SWIFT_VERSION = '5.0';

/**
 * Build settings inherited from the main app when the target does not set them.
 */
const ESSENTIAL_INHERITED_SETTINGS = [
  'CLANG_ENABLE_MODULES',
  'TARGETED_DEVICE_FAMILY',
];

const CODE_SETTINGS_BY_PROP: {
  prop: keyof IOSTargetProps;
  xcodeKey: string;
}[] = [
  { prop: 'targetedDeviceFamily', xcodeKey: 'TARGETED_DEVICE_FAMILY' },
  { prop: 'clangEnableModules', xcodeKey: 'CLANG_ENABLE_MODULES' },
  { prop: 'swiftEmitLocStrings', xcodeKey: 'SWIFT_EMIT_LOC_STRINGS' },
];

function unquote(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return;
  }
  return String(value).replace(/"/g, '');
}

/**
 * All targets (extensions and App Clips) must carry the same version numbers as
 * their parent app so `$(CURRENT_PROJECT_VERSION)` / `$(MARKETING_VERSION)`
 * resolve consistently in Info.plist.
 */
function planVersionSettings(
  expoConfig: Partial<ExpoConfig>,
  mainBuildSettings: Record<string, any>
): Record<string, string> {
  return {
    CURRENT_PROJECT_VERSION:
      process.env.EAS_BUILD_IOS_BUILD_NUMBER ||
      expoConfig.ios?.buildNumber ||
      unquote(mainBuildSettings.CURRENT_PROJECT_VERSION) ||
      '1',
    MARKETING_VERSION:
      expoConfig.version ||
      unquote(mainBuildSettings.MARKETING_VERSION) ||
      '1.0.0',
  };
}

function planEntitlementsSetting({
  props,
  paths,
}: {
  props: IOSTargetProps;
  paths: ProjectPaths;
}): Record<string, string> {
  const entitlementsPath = Paths.getTargetEntitlementsPath({
    platformProjectRoot: paths.platformProjectRoot,
    projectName: paths.projectName,
    productName: Paths.sanitizeTargetName(props.displayName || props.name),
  });

  return {
    CODE_SIGN_ENTITLEMENTS: `"${path.relative(
      paths.platformProjectRoot,
      entitlementsPath
    )}"`,
  };
}

function planSwiftVersion(
  props: IOSTargetProps,
  mainBuildSettings: Record<string, any>
): string {
  if (props.swiftVersion !== undefined) {
    return String(props.swiftVersion);
  }
  return mainBuildSettings.SWIFT_VERSION || FALLBACK_SWIFT_VERSION;
}

function planCodeSettings(
  props: IOSTargetProps,
  mainBuildSettings: Record<string, any>
): Record<string, string> {
  const settings: Record<string, string> = {};

  for (const { prop, xcodeKey } of CODE_SETTINGS_BY_PROP) {
    if (props[prop] !== undefined) {
      settings[xcodeKey] = String(props[prop]);
    } else if (mainBuildSettings[xcodeKey]) {
      settings[xcodeKey] = mainBuildSettings[xcodeKey];
    }
  }

  return settings;
}

/**
 * App Clips are standalone products: override search paths so CocoaPods build
 * settings from the host app cannot contaminate them.
 */
function planIsolatedSearchPathSettings(): Record<string, string | string[]> {
  return {
    ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES: 'YES',
    // Explicit clean paths (blank values get replaced with defaults). These
    // avoid Pods while still allowing Swift/system frameworks.
    LIBRARY_SEARCH_PATHS: [
      '"$(SDKROOT)/usr/lib/swift"',
      '"$(TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)"',
    ],
    FRAMEWORK_SEARCH_PATHS: '"$(PLATFORM_DIR)/Developer/Library/Frameworks"',
    LD_RUNPATH_SEARCH_PATHS: [
      '"@executable_path/Frameworks"',
      '"@loader_path/Frameworks"',
    ],
    // SwiftUI-specific settings (required for proper SwiftUI framework linking)
    GENERATE_INFOPLIST_FILE: 'YES',
    INFOPLIST_KEY_UIApplicationSceneManifest_Generation: 'YES',
    INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents: 'YES',
    INFOPLIST_KEY_UILaunchScreen_Generation: 'YES',
    ENABLE_PREVIEWS: 'YES',
  };
}

/** Stickers always; messages only when `ios.targetIcon` is a file path. */
function planIMessageAppIconSetting(
  props: IOSTargetProps
): Record<string, string> {
  if (
    props.type === 'stickers' ||
    (props.type === 'messages' && props.targetIcon)
  ) {
    return { ASSETCATALOG_COMPILER_APPICON_NAME: '"iMessage App Icon"' };
  }
  return {};
}

function planInheritedSettings(
  mainBuildSettings: Record<string, any>,
  type: string
): Record<string, string> {
  const settings: Record<string, string> = {};
  for (const key of ESSENTIAL_INHERITED_SETTINGS) {
    // Watch companions / watch widgets must not inherit the host phone/pad device family.
    if (
      (type === 'watch' || type === 'watch-widget') &&
      key === 'TARGETED_DEVICE_FAMILY'
    ) {
      continue;
    }
    if (mainBuildSettings[key]) {
      settings[key] = mainBuildSettings[key];
    }
  }
  return settings;
}

/**
 * watchOS companion apps: SDK/family/deployment are watch-specific and must
 * not inherit the iPhone host's IPHONEOS_* settings.
 */
function planWatchOsSettings(
  deploymentTarget: string,
  mainBuildSettings: Record<string, any>
): Record<string, string | string[]> {
  const settings: Record<string, string | string[]> = {
    SDKROOT: 'watchos',
    SUPPORTED_PLATFORMS: '"watchos watchsimulator"',
    TARGETED_DEVICE_FAMILY: '"4"',
    WATCHOS_DEPLOYMENT_TARGET: deploymentTarget,
    SUPPORTS_MACCATALYST: 'NO',
    ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES: 'YES',
    LIBRARY_SEARCH_PATHS: [
      '"$(SDKROOT)/usr/lib/swift"',
      '"$(TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)"',
    ],
    FRAMEWORK_SEARCH_PATHS: '"$(PLATFORM_DIR)/Developer/Library/Frameworks"',
    LD_RUNPATH_SEARCH_PATHS: [
      '"@executable_path/Frameworks"',
      '"@loader_path/Frameworks"',
    ],
    GENERATE_INFOPLIST_FILE: 'YES',
  };

  const team =
    unquote(mainBuildSettings.DEVELOPMENT_TEAM) ||
    process.env.APPLE_TEAM_ID ||
    process.env.DEVELOPMENT_TEAM;
  if (team) {
    settings.DEVELOPMENT_TEAM = `"${team}"`;
  }

  return settings;
}

/**
 * Plan every build setting applied to the target's configurations.
 */
export function planBuildSettings({
  props,
  identity,
  expoConfig,
  mainBuildSettings,
  paths,
  infoPlistReferencePath,
}: Pick<
  TargetPlanInput,
  'props' | 'expoConfig' | 'mainBuildSettings' | 'paths'
> & {
  identity: TargetIdentity;
  infoPlistReferencePath: string;
}): Record<string, string | string[]> {
  const typeConfig = TYPE_CHARACTERISTICS[props.type];
  const isWatchOs = props.type === 'watch' || props.type === 'watch-widget';

  const settings: Record<string, string | string[]> = {
    PRODUCT_NAME: `"${identity.targetProductName}"`,
    PRODUCT_BUNDLE_IDENTIFIER: `"${identity.bundleIdentifier}"`,
    INFOPLIST_FILE: `"${infoPlistReferencePath}"`,
    ...planInheritedSettings(mainBuildSettings, props.type),
    ...planVersionSettings(expoConfig, mainBuildSettings),
    SWIFT_VERSION: planSwiftVersion(props, mainBuildSettings),
  };

  if (isWatchOs) {
    Object.assign(
      settings,
      planWatchOsSettings(identity.deploymentTarget, mainBuildSettings)
    );
  } else {
    settings.IPHONEOS_DEPLOYMENT_TARGET = identity.deploymentTarget;
  }

  // Keep INFOPLIST_KEY as a belt-and-suspenders signal for Xcode UI; the
  // generated Info.plist already sets CFBundleDisplayName when displayName is set
  // (INFOPLIST_KEY alone does not override an existing Info.plist key).
  if (props.displayName) {
    settings.INFOPLIST_KEY_CFBundleDisplayName = `"${props.displayName}"`;
  }

  if (typeConfig.requiresEntitlements) {
    Object.assign(settings, planEntitlementsSetting({ props, paths }));
  }

  if (typeConfig.requiresCode) {
    Object.assign(settings, planCodeSettings(props, mainBuildSettings));
  }

  Object.assign(settings, planIMessageAppIconSetting(props));

  // Re-assert watchOS family after planCodeSettings (which may inherit host 1,2).
  if (isWatchOs) {
    settings.TARGETED_DEVICE_FAMILY = '"4"';
    settings.SDKROOT = 'watchos';
    settings.SUPPORTED_PLATFORMS = '"watchos watchsimulator"';
  }

  // SwiftUI App Clips isolate search paths from the host Pods tree. RN clips
  // (`entry` set) need those Pods paths to `import React`. Watch always isolates
  // (handled in planWatchOsSettings).
  if (!isWatchOs && typeConfig.needsIsolatedSearchPaths && !props.entry) {
    Object.assign(settings, planIsolatedSearchPathSettings());
  }

  return settings;
}
