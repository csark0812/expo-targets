import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins';
import fs from 'fs';
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
  TYPE_CHARACTERISTICS,
} from '../target';
import { Xcode, Paths, File, Asset, ReactNativeSwift } from '../utils';

interface IOSTargetProps extends IOSTargetConfigWithReactNative {
  type: ExtensionType;
  name: string;
  entry?: string;
  excludedPackages?: string[];
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
    const targetProductName = Paths.sanitizeTargetName(targetName);
    const typeConfig = TYPE_CHARACTERISTICS[props.type];

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

    // Create target directory in Xcode project
    const targetGroupPath = Paths.getTargetGroupPath({
      platformProjectRoot,
      targetName,
    });
    File.ensureDirectoryExists(targetGroupPath);

    // Generate Info.plist directly in target directory
    const infoPlistPath = Paths.getInfoPlistPath({
      platformProjectRoot,
      targetName,
    });
    if (!File.isFile(infoPlistPath)) {
      // Extract URL schemes from expo config for auto-injection into extensions
      const mainAppSchemes: string[] = [];
      if (config.scheme) {
        if (typeof config.scheme === 'string') {
          mainAppSchemes.push(config.scheme);
        } else if (Array.isArray(config.scheme)) {
          mainAppSchemes.push(...config.scheme);
        }
      }

      // Also include the bundle ID as a URL scheme
      // Expo automatically registers it, and openHostApp() uses it
      if (config.ios?.bundleIdentifier) {
        mainAppSchemes.push(config.ios.bundleIdentifier);
      }

      // Extract targets config to embed in Info.plist for runtime access
      const targetsConfig = config.extra?.targets as any[] | undefined;

      const infoPlistContent = getTargetInfoPlistForType(
        props.type,
        props.infoPlist,
        props.type === 'share'
          ? {
              activationRules: props.activationRules,
              preprocessingFile: props.preprocessingFile,
            }
          : undefined,
        props.entry,
        mainAppSchemes.length > 0 ? mainAppSchemes : undefined,
        targetsConfig
      );
      File.writeFileSafe(infoPlistPath, infoPlistContent);
      console.log(`[expo-targets] Generated Info.plist for ${targetName}`);
    }

    // Create iMessage App Icon for sticker pack targets
    if (props.type === 'stickers') {
      const assetsPath = Paths.getAssetsXcassetsPath({
        platformProjectRoot,
        targetName,
        isStickers: true,
      });

      // Create root Contents.json for Stickers.xcassets
      Asset.createAssetsXcassetsRoot(assetsPath);

      const iconsetPath = path.join(
        assetsPath,
        'iMessage App Icon.stickersiconset'
      );

      // Resolve source icon path if provided
      const sourceIconPath = props.imessageAppIcon
        ? path.isAbsolute(props.imessageAppIcon)
          ? props.imessageAppIcon
          : path.join(projectRoot, props.imessageAppIcon)
        : undefined;

      Asset.createIMessageAppIcon({
        iconsetPath,
        sourceIconPath,
      });
      console.log(
        `[expo-targets] Created iMessage App Icon set for ${targetName}`
      );

      // Create sticker packs
      if (props.stickerPacks && props.stickerPacks.length > 0) {
        props.stickerPacks.forEach((stickerPack) => {
          const stickerPackPath = Paths.getStickerPackPath({
            platformProjectRoot,
            targetName,
            stickerPackName: stickerPack.name,
          });

          Asset.createStickerPack({
            stickerPackPath,
            name: stickerPack.name,
            assets: stickerPack.assets,
          });

          // Copy sticker assets to the pack
          stickerPack.assets.forEach((assetPath: string) => {
            const absoluteAssetPath = path.isAbsolute(assetPath)
              ? assetPath
              : path.join(projectRoot, props.directory, assetPath);

            if (fs.existsSync(absoluteAssetPath)) {
              const filename = path.basename(assetPath);
              const baseName = path.basename(
                assetPath,
                path.extname(assetPath)
              );
              const stickerDirPath = path.join(
                stickerPackPath,
                `${baseName}.sticker`
              );

              // Create .sticker directory with Contents.json
              Asset.createSticker({
                stickerPath: stickerDirPath,
                filename,
              });

              // Copy image into .sticker directory
              const destPath = path.join(stickerDirPath, filename);
              fs.copyFileSync(absoluteAssetPath, destPath);
            } else {
              console.warn(
                `[expo-targets] Sticker asset not found: ${absoluteAssetPath}`
              );
            }
          });

          console.log(
            `[expo-targets] Created sticker pack "${stickerPack.name}" with ${stickerPack.assets.length} sticker(s)`
          );
        });
      }
    }

    const pbxProject = config.modResults;
    const xcodeProject = pbxProject as any;

    // Get main app target
    const projectName = Xcode.getProjectName(projectRoot);
    const mainTarget = Xcode.getApplicationNativeTarget({
      project: xcodeProject,
      projectName,
    });

    // Remove any duplicate targets with the same product name
    Xcode.removeDuplicateTargets({
      project: xcodeProject,
      productName: targetProductName,
    });

    // Check if target already exists
    const existingTargetUuid = Xcode.findTargetByProductName({
      project: xcodeProject,
      productName: targetProductName,
    });

    let target: any;
    if (existingTargetUuid) {
      console.log(
        `[expo-targets] Target ${targetProductName} already exists, reusing`
      );
      target = {
        uuid: existingTargetUuid,
        target:
          xcodeProject.hash.project.objects.PBXNativeTarget[existingTargetUuid],
      };
    } else {
      console.log(
        `[expo-targets] Creating native target: ${targetProductName}`
      );

      const targetType = typeConfig.targetType;

      target = xcodeProject.addTarget(
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
    }

    // Always set product type for precision (all types have specific product types)
    Xcode.setProductType({ target, productType });
    console.log(
      `[expo-targets] Set product type to ${productType} for ${props.type}`
    );

    // Remove auto-created build phases for asset-only targets
    if (!typeConfig.requiresCode && !existingTargetUuid) {
      console.log(
        `[expo-targets] Removing auto-created code build phases from asset-only target`
      );
      Xcode.removeBuildPhases({
        project: xcodeProject,
        targetUuid: target.uuid,
        phaseType: 'PBXSourcesBuildPhase',
      });
      Xcode.removeBuildPhases({
        project: xcodeProject,
        targetUuid: target.uuid,
        phaseType: 'PBXFrameworksBuildPhase',
      });
    }

    // Get main app's build settings to inherit from
    const mainBuildSettings = Xcode.getMainAppBuildSettings({
      project: xcodeProject,
      mainTarget,
    });

    console.log(
      `[expo-targets] Main app SWIFT_VERSION: ${mainBuildSettings.SWIFT_VERSION || 'NOT SET'}`
    );

    // Get the actual directory name used for target files (includes 'Target' suffix)
    const targetDirName = path.basename(targetGroupPath);

    // Build settings that should be target-specific
    const targetSpecificSettings: Record<string, string> = {
      PRODUCT_NAME: `"${targetProductName}"`,
      PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
      INFOPLIST_FILE: `"${targetDirName}/Info.plist"`,
    };

    // Only code-based targets need entitlements
    if (typeConfig.requiresEntitlements) {
      targetSpecificSettings.CODE_SIGN_ENTITLEMENTS = `"${targetDirName}/generated.entitlements"`;
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

    // SWIFT_VERSION required even for asset-only targets
    if (props.swiftVersion !== undefined) {
      buildSettings.SWIFT_VERSION = String(props.swiftVersion);
      console.log(
        `[expo-targets] Using custom SWIFT_VERSION: ${props.swiftVersion}`
      );
    } else if (mainBuildSettings.SWIFT_VERSION) {
      buildSettings.SWIFT_VERSION = mainBuildSettings.SWIFT_VERSION;
      console.log(
        `[expo-targets] Inherited SWIFT_VERSION: ${mainBuildSettings.SWIFT_VERSION}`
      );
    } else {
      buildSettings.SWIFT_VERSION = '5.0';
      console.log(`[expo-targets] Using fallback SWIFT_VERSION: 5.0`);
    }

    // Code-based targets need additional build settings
    if (typeConfig.requiresCode) {
      const buildSettingsMap: Record<
        string,
        { prop: keyof IOSTargetProps; xcodeKey: string }
      > = {
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

      Object.entries(buildSettingsMap).forEach(([key, { prop, xcodeKey }]) => {
        if (props[prop] !== undefined) {
          buildSettings[xcodeKey] = String(props[prop]);
          console.log(
            `[expo-targets] Using custom ${xcodeKey}: ${props[prop]}`
          );
        } else if (mainBuildSettings[xcodeKey]) {
          buildSettings[xcodeKey] = mainBuildSettings[xcodeKey];
          console.log(
            `[expo-targets] Inherited ${xcodeKey}: ${mainBuildSettings[xcodeKey]}`
          );
        }
      });
    } else {
      console.log(
        `[expo-targets] Skipping code-related build settings for asset-only target`
      );

      // Sticker packs need asset catalog compiler settings
      if (props.type === 'stickers') {
        buildSettings.ASSETCATALOG_COMPILER_APPICON_NAME =
          '"iMessage App Icon"';
        console.log(
          `[expo-targets] Set ASSETCATALOG_COMPILER_APPICON_NAME for sticker pack`
        );
      }
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

    // Standalone apps should not have SKIP_INSTALL
    Xcode.removeBuildSetting({
      project: xcodeProject,
      target,
      settingKey: 'SKIP_INSTALL',
      verbose: true,
    });

    console.log(
      `[expo-targets] Configured build settings for ${targetProductName}`
    );

    // Only code-based targets need Sources and Frameworks build phases
    if (typeConfig.requiresCode) {
      // Ensure the target has a Sources build phase (skip if already exists)
      if (
        !Xcode.hasBuildPhase({
          project: xcodeProject,
          targetUuid: target.uuid,
          phaseType: 'PBXSourcesBuildPhase',
        })
      ) {
        const sourcesBuildPhase = xcodeProject.addBuildPhase(
          [],
          'PBXSourcesBuildPhase',
          'Sources',
          target.uuid
        );
        console.log(
          `[expo-targets] Created Sources build phase for ${targetProductName}`
        );
      } else {
        console.log(
          `[expo-targets] Sources build phase already exists for ${targetProductName}`
        );
      }

      // Ensure the target has a Frameworks build phase (skip if already exists)
      if (
        !Xcode.hasBuildPhase({
          project: xcodeProject,
          targetUuid: target.uuid,
          phaseType: 'PBXFrameworksBuildPhase',
        })
      ) {
        const frameworksBuildPhase = xcodeProject.addBuildPhase(
          [],
          'PBXFrameworksBuildPhase',
          'Frameworks',
          target.uuid
        );
        console.log(
          `[expo-targets] Created Frameworks build phase for ${targetProductName}`
        );
      } else {
        console.log(
          `[expo-targets] Frameworks build phase already exists for ${targetProductName}`
        );
      }
    } else {
      console.log(
        `[expo-targets] Skipping Sources and Frameworks build phases for asset-only target`
      );
    }

    // Ensure the target has a Resources build phase (skip if already exists)
    if (
      !Xcode.hasBuildPhase({
        project: xcodeProject,
        targetUuid: target.uuid,
        phaseType: 'PBXResourcesBuildPhase',
      })
    ) {
      const resourcesBuildPhase = xcodeProject.addBuildPhase(
        [],
        'PBXResourcesBuildPhase',
        'Resources',
        target.uuid
      );
      console.log(
        `[expo-targets] Created Resources build phase for ${targetProductName}`
      );
    } else {
      console.log(
        `[expo-targets] Resources build phase already exists for ${targetProductName}`
      );
    }

    // Copy Swift files from user's target directory (skip for asset-only targets)
    const targetDirectory = Paths.getTargetDirectory({
      projectRoot,
      targetDirectory: props.directory,
    });
    let swiftFiles = typeConfig.requiresCode
      ? globSync('**/*.swift', {
          cwd: targetDirectory,
          absolute: false,
        })
      : [];

    // Auto-generate ReactNativeViewController.swift if using React Native without user Swift files
    if (props.entry && swiftFiles.length === 0) {
      console.log(
        `[expo-targets] No Swift files found - generating ReactNativeViewController.swift for React Native`
      );

      const moduleName = targetProductName;
      const generatedSwift = ReactNativeSwift.generateReactNativeViewController(
        {
          type: props.type,
          moduleName,
          targetName: props.name,
          preprocessingFile: props.preprocessingFile,
          entry: props.entry,
        }
      );

      const generatedFilePath = path.join(
        targetGroupPath,
        'ReactNativeViewController.swift'
      );
      File.writeFileSafe(generatedFilePath, generatedSwift);
      swiftFiles = ['ReactNativeViewController.swift'];

      console.log(
        `[expo-targets] Generated ReactNativeViewController.swift for ${moduleName}`
      );
    } else if (props.entry && swiftFiles.length > 0) {
      console.log(
        `[expo-targets] Using user-provided Swift files with React Native entry point`
      );
    }

    console.log(
      `[expo-targets] Found ${swiftFiles.length} Swift file(s) in ${props.directory}/ios`
    );

    // Ensure group exists for the target
    Xcode.ensureGroupRecursively(xcodeProject, targetDirName);
    console.log(`[expo-targets] Ensured group exists: ${targetDirName}`);

    // Copy and add Info.plist from build folder
    const infoPlistDest = path.join(targetGroupPath, 'Info.plist');
    if (File.isFile(infoPlistPath)) {
      File.copyFileSafe(infoPlistPath, infoPlistDest);
      console.log(`[expo-targets] Copied Info.plist to ${targetDirName}/`);

      // Manually add Info.plist to avoid addResourceFile's "Resources" group requirement
      // We use the build settings INFOPLIST_FILE instead of adding to Resources phase
      console.log(`[expo-targets] Info.plist configured via build settings`);
    }

    // Add Swift files to project (either user-provided or generated)
    swiftFiles.forEach((file) => {
      let sourceFile: string;
      let destFile: string;

      if (
        props.entry &&
        file === 'ReactNativeViewController.swift' &&
        !fs.existsSync(path.join(targetDirectory, file))
      ) {
        // Generated file - already at destination
        destFile = path.join(targetGroupPath, file);
        sourceFile = destFile; // No need to copy, already written
      } else {
        // User-provided file - copy it
        sourceFile = path.join(targetDirectory, file);
        destFile = path.join(targetGroupPath, path.basename(file));
        File.copyFileSafe(sourceFile, destFile);
        console.log(`[expo-targets]   Copied: ${file} -> ${targetDirName}/`);
      }

      // Add the file to the target's Sources build phase
      const relativePath = path.relative(platformProjectRoot, destFile);
      Xcode.addBuildSourceFileToGroup({
        filepath: relativePath,
        groupName: targetDirName,
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
      platformProjectRoot,
      targetName,
      targetUuid: target.uuid,
      xcodeProject,
      isStickers: props.type === 'stickers',
    });

    // Add Info.plist reference via build settings
    console.log(`[expo-targets] Info.plist configured via build settings`);

    // Link frameworks (skip for asset-only targets)
    if (typeConfig.requiresCode && frameworks.length > 0) {
      frameworks.forEach((framework) => {
        console.log(`[expo-targets]   Linking framework: ${framework}`);
        xcodeProject.addFramework(`${framework}.framework`, {
          target: target.uuid,
          link: true,
        });
      });
    } else if (!typeConfig.requiresCode) {
      console.log(
        `[expo-targets] Skipping framework linking for asset-only target`
      );
    }

    // Add target dependency for app extensions and clips
    console.log(`[expo-targets] Adding target dependency to main app`);

    Xcode.addTargetDependency({
      project: xcodeProject,
      mainTargetUuid: mainTarget.uuid,
      dependentTargetUuid: target.uuid,
    });

    // Configure embedding based on extension embed type
    if (typeConfig.embedType === 'foundation-extension') {
      console.log(
        `[expo-targets] Configuring "Embed Foundation Extensions" build phase`
      );
      Xcode.configureAppExtensionEmbed({
        project: xcodeProject,
        targetProductName,
      });
    } else if (typeConfig.embedType === 'app-clip') {
      console.log(`[expo-targets] Creating "Embed App Clips" build phase`);
      Xcode.configureAppClipEmbed({
        project: xcodeProject,
        mainTargetUuid: mainTarget.uuid,
        target,
        targetProductName,
      });
    }
    // 'none' embedType = no embedding configuration needed (e.g., watch apps)

    console.log(`[expo-targets] Successfully configured ${targetName} target`);

    return config;
  });
};
