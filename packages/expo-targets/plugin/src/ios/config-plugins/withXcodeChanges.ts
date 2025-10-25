import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins';
import { globSync } from 'glob';
import path from 'path';

import type {
  ExtensionType,
  IOSTargetConfigWithReactNative,
} from '../../config';
import { TYPE_BUNDLE_IDENTIFIER_SUFFIXES } from '../../config';
import {
  productTypeForType,
  getFrameworksForType,
  getTargetInfoPlistForType,
} from '../target';
import { Xcode, Paths, File } from '../utils';

interface IOSTargetProps extends IOSTargetConfigWithReactNative {
  type: ExtensionType;
  name: string;
  directory: string;
  configPath: string;
}

export const withXcodeChanges: ConfigPlugin<IOSTargetProps> = (
  config,
  props
) => {
  return withXcodeProject(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const platformProjectRoot = config.modRequest.platformProjectRoot;
    const targetName = props.displayName || props.name;

    console.log(
      `[expo-targets] Adding Xcode target: ${targetName} (${props.type})`
    );

    const mainBundleId = config.ios?.bundleIdentifier;
    if (!mainBundleId) {
      throw new Error('iOS bundle identifier not found in app.json');
    }

    // Use type-specific suffix, falling back to sanitized target name if not in map
    const bundleIdentifierSuffix =
      TYPE_BUNDLE_IDENTIFIER_SUFFIXES[props.type] ||
      Paths.sanitizeTargetName(props.name);
    const bundleIdentifier =
      props.bundleIdentifier || `${mainBundleId}.${bundleIdentifierSuffix}`;
    const deploymentTarget = props.deploymentTarget || '18.0';
    const productType = productTypeForType(props.type);
    const frameworks = [
      ...(getFrameworksForType(props.type) || []),
      ...(props.frameworks || []),
    ];

    // Generate Info.plist in build folder if it doesn't exist
    const infoPlistPath = Paths.getInfoPlistPath({
      projectRoot,
      targetDirectory: props.directory,
    });
    if (!File.isFile(infoPlistPath)) {
      const infoPlistContent = getTargetInfoPlistForType(props.type);
      File.writeFileSafe(infoPlistPath, infoPlistContent);
      console.log(`[expo-targets] Generated Info.plist for ${targetName}`);
    }

    const pbxProject = config.modResults;
    const xcodeProject = pbxProject as any;

    // Get main app target
    const projectName = Xcode.getProjectName(projectRoot);
    const mainTarget = Xcode.getApplicationNativeTarget({
      project: xcodeProject,
      projectName,
    });

    // Create the extension target
    const targetProductName = Paths.sanitizeTargetName(targetName);

    console.log(`[expo-targets] Creating native target: ${targetProductName}`);

    const targetType = props.type === 'clip' ? 'application' : 'app_extension';

    const target = xcodeProject.addTarget(
      targetProductName,
      targetType,
      targetProductName,
      bundleIdentifier
    );

    if (!target) {
      throw new Error(`Failed to create target for ${targetName}`);
    }

    if (!target.uuid) {
      throw new Error(`Target created but has no UUID: ${targetName}`);
    }

    // Fix product type for App Clips
    // addTarget creates a regular application, but App Clips need special product type
    if (props.type === 'clip') {
      Xcode.setProductType({ target, productType });
      console.log(
        `[expo-targets] Set product type to ${productType} for App Clip`
      );
    }

    // Get main app's build settings to inherit from
    const mainBuildSettings = Xcode.getMainAppBuildSettings({
      project: xcodeProject,
      mainTarget,
    });

    console.log(
      `[expo-targets] Main app SWIFT_VERSION: ${mainBuildSettings.SWIFT_VERSION || 'NOT SET'}`
    );

    // Build settings that should be target-specific
    const targetSpecificSettings: Record<string, string> = {
      PRODUCT_NAME: `"${targetProductName}"`,
      PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
      INFOPLIST_FILE: `"${targetProductName}/Info.plist"`,
      CODE_SIGN_ENTITLEMENTS: `"${targetProductName}/generated.entitlements"`,
    };

    // App Clips are standalone apps - don't skip install
    // Extensions get embedded in main app - skip install
    if (props.type !== 'clip') {
      targetSpecificSettings.SKIP_INSTALL = 'YES';
    }

    // Inherit essential build settings from main app if not already set
    const essentialSettings = [
      'CLANG_ENABLE_MODULES',
      'TARGETED_DEVICE_FAMILY',
      'MARKETING_VERSION',
      'CURRENT_PROJECT_VERSION',
    ];

    essentialSettings.forEach((setting) => {
      if (mainBuildSettings[setting]) {
        targetSpecificSettings[setting] = mainBuildSettings[setting];
        console.log(
          `[expo-targets] Inherited ${setting}: ${mainBuildSettings[setting]}`
        );
      }
    });

    // Build final settings: target-specific + inherited + deployment target + custom overrides
    const buildSettings: Record<string, string> = {
      ...targetSpecificSettings,
    };

    // Map camelCase properties to Xcode build settings
    const buildSettingsMap: Record<
      string,
      { prop: keyof IOSTargetProps; xcodeKey: string }
    > = {
      swiftVersion: { prop: 'swiftVersion', xcodeKey: 'SWIFT_VERSION' },
      targetedDeviceFamily: {
        prop: 'targetedDeviceFamily',
        xcodeKey: 'TARGETED_DEVICE_FAMILY',
      },
      clangEnableModules: {
        prop: 'clangEnableModules',
        xcodeKey: 'CLANG_ENABLE_MODULES',
      },
      swiftEmitLocStrings: {
        prop: 'swiftEmitLocStrings',
        xcodeKey: 'SWIFT_EMIT_LOC_STRINGS',
      },
    };

    // Inherit or set build settings
    Object.entries(buildSettingsMap).forEach(([key, { prop, xcodeKey }]) => {
      if (props[prop] !== undefined) {
        // User explicitly set it
        buildSettings[xcodeKey] = String(props[prop]);
        console.log(`[expo-targets] Using custom ${xcodeKey}: ${props[prop]}`);
      } else if (mainBuildSettings[xcodeKey]) {
        // Inherit from main app
        buildSettings[xcodeKey] = mainBuildSettings[xcodeKey];
        console.log(
          `[expo-targets] Inherited ${xcodeKey}: ${mainBuildSettings[xcodeKey]}`
        );
      }
    });

    // Fallback for SWIFT_VERSION
    if (!buildSettings.SWIFT_VERSION) {
      buildSettings.SWIFT_VERSION = '5.0';
      console.log(`[expo-targets] Using fallback SWIFT_VERSION: 5.0`);
    }

    // Apply deployment target if specified
    if (deploymentTarget) {
      buildSettings.IPHONEOS_DEPLOYMENT_TARGET = deploymentTarget;
    }

    // App Clips are standalone - override search paths to prevent Pods contamination
    if (props.type === 'clip') {
      buildSettings.ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = 'YES';

      // Set explicit clean paths (not blank, as blank gets overridden with defaults)
      // These paths avoid Pods while still allowing Swift/system frameworks
      // For multi-value settings, pass as arrays (xcode package formats correctly)
      (buildSettings as any).LIBRARY_SEARCH_PATHS = [
        '"$(SDKROOT)/usr/lib/swift"',
        '"$(TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)"',
      ];

      buildSettings.FRAMEWORK_SEARCH_PATHS =
        '"$(PLATFORM_DIR)/Developer/Library/Frameworks"';

      (buildSettings as any).LD_RUNPATH_SEARCH_PATHS = [
        '"@executable_path/Frameworks"',
        '"@loader_path/Frameworks"',
      ];

      // Don't set OTHER_SWIFT_FLAGS - let it use defaults to avoid duplication

      // SwiftUI-specific settings (required for proper SwiftUI framework linking)
      buildSettings.GENERATE_INFOPLIST_FILE = 'YES';
      buildSettings.INFOPLIST_KEY_UIApplicationSceneManifest_Generation = 'YES';
      buildSettings.INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents =
        'YES';
      buildSettings.INFOPLIST_KEY_UILaunchScreen_Generation = 'YES';
      buildSettings.ENABLE_PREVIEWS = 'YES';
    }

    console.log(
      `[expo-targets] Final SWIFT_VERSION for ${targetProductName}: ${buildSettings.SWIFT_VERSION}`
    );

    // Apply build settings to target
    Xcode.applyBuildSettings({
      project: xcodeProject,
      target,
      buildSettings,
      verbose: true,
    });

    // App Clips should not have SKIP_INSTALL - they're standalone apps
    if (props.type === 'clip') {
      Xcode.removeBuildSetting({
        project: xcodeProject,
        target,
        settingKey: 'SKIP_INSTALL',
        verbose: true,
      });
    }

    console.log(
      `[expo-targets] Configured build settings for ${targetProductName}`
    );

    // Ensure the target has a Sources build phase
    const sourcesBuildPhase = xcodeProject.addBuildPhase(
      [],
      'PBXSourcesBuildPhase',
      'Sources',
      target.uuid
    );
    console.log(
      `[expo-targets] Created Sources build phase for ${targetProductName}`
    );

    // Ensure the target has a Frameworks build phase
    const frameworksBuildPhase = xcodeProject.addBuildPhase(
      [],
      'PBXFrameworksBuildPhase',
      'Frameworks',
      target.uuid
    );
    console.log(
      `[expo-targets] Created Frameworks build phase for ${targetProductName}`
    );

    // Ensure the target has a Resources build phase
    const resourcesBuildPhase = xcodeProject.addBuildPhase(
      [],
      'PBXResourcesBuildPhase',
      'Resources',
      target.uuid
    );
    console.log(
      `[expo-targets] Created Resources build phase for ${targetProductName}`
    );

    // Copy Swift files and Info.plist into ios/ directory
    // Note: Files copied to ios/{target}/ for Xcode accessibility
    const targetGroupPath = Paths.getTargetGroupPath({
      platformProjectRoot,
      targetName,
    });
    File.ensureDirectoryExists(targetGroupPath);

    // Copy generated.entitlements from build folder
    const entitlementsSource = Paths.getGeneratedEntitlementsPath({
      projectRoot,
      targetDirectory: props.directory,
    });
    const entitlementsDest = path.join(
      targetGroupPath,
      'generated.entitlements'
    );
    if (File.isFile(entitlementsSource)) {
      File.copyFileSafe(entitlementsSource, entitlementsDest);
      console.log(
        `[expo-targets] Copied generated.entitlements to ${targetProductName}/`
      );
    }

    const targetDirectory = Paths.getTargetDirectory({
      projectRoot,
      targetDirectory: props.directory,
    });
    const swiftFiles = globSync('**/*.swift', {
      cwd: targetDirectory,
      absolute: false,
    });

    console.log(
      `[expo-targets] Found ${swiftFiles.length} Swift file(s) in ${props.directory}/ios`
    );

    // Ensure group exists for the target
    Xcode.ensureGroupRecursively(xcodeProject, targetProductName);
    console.log(`[expo-targets] Ensured group exists: ${targetProductName}`);

    // Copy and add Info.plist from build folder
    const infoPlistDest = path.join(targetGroupPath, 'Info.plist');
    if (File.isFile(infoPlistPath)) {
      File.copyFileSafe(infoPlistPath, infoPlistDest);
      console.log(`[expo-targets] Copied Info.plist to ${targetProductName}/`);

      // Manually add Info.plist to avoid addResourceFile's "Resources" group requirement
      // We use the build settings INFOPLIST_FILE instead of adding to Resources phase
      console.log(`[expo-targets] Info.plist configured via build settings`);
    }

    swiftFiles.forEach((file) => {
      const sourceFile = path.join(targetDirectory, file);
      const destFile = path.join(targetGroupPath, path.basename(file));

      File.copyFileSafe(sourceFile, destFile);
      console.log(`[expo-targets]   Copied: ${file} -> ${targetProductName}/`);

      // Add the file to the target's Sources build phase
      const relativePath = path.relative(platformProjectRoot, destFile);
      Xcode.addBuildSourceFileToGroup({
        filepath: relativePath,
        groupName: targetProductName,
        project: xcodeProject,
        verbose: true,
        targetUuid: target.uuid,
      });
      console.log(
        `[expo-targets]   Added to build phase: ${path.basename(file)}`
      );
    });

    // Add Assets.xcassets if it exists
    Xcode.addTargetAssets({
      projectRoot,
      platformProjectRoot,
      targetName,
      targetDirectory: props.directory,
      targetUuid: target.uuid,
      xcodeProject,
    });

    // Add Info.plist reference via build settings
    console.log(`[expo-targets] Info.plist configured via build settings`);

    // Link frameworks
    frameworks.forEach((framework) => {
      console.log(`[expo-targets]   Linking framework: ${framework}`);
      xcodeProject.addFramework(`${framework}.framework`, {
        target: target.uuid,
        link: true,
      });
    });

    // Add target dependency for app extensions and clips
    console.log(`[expo-targets] Adding target dependency to main app`);

    Xcode.addTargetDependency({
      project: xcodeProject,
      mainTargetUuid: mainTarget.uuid,
      dependentTargetUuid: target.uuid,
    });

    // App Clips and Extensions need different embed settings
    if (props.type !== 'clip') {
      console.log(
        `[expo-targets] Configuring "Embed App Extensions" build phase`
      );
      Xcode.configureAppExtensionEmbed({
        project: xcodeProject,
        targetProductName,
      });
    } else {
      console.log(`[expo-targets] Creating "Embed App Clips" build phase`);
      Xcode.configureAppClipEmbed({
        project: xcodeProject,
        mainTargetUuid: mainTarget.uuid,
        target,
        targetProductName,
      });
    }

    console.log(`[expo-targets] Successfully configured ${targetName} target`);

    return config;
  });
};
