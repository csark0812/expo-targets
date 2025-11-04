import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins';
import crypto from 'crypto';
import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';

import type {
  ExtensionType,
  IOSTargetConfigWithReactNative,
} from '../../config';
import { TYPE_BUNDLE_IDENTIFIER_SUFFIXES } from '../../config';
import { Logger } from '../../logger';
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
  logger: Logger;
}

/**
 * Generate hash signature of Info.plist config inputs
 * Used to detect when configuration has changed and Info.plist needs regeneration
 */
function generateInfoPlistSignature(inputs: {
  type: ExtensionType;
  entry?: string;
  infoPlist?: Record<string, any>;
  activationRules?: any[];
  preprocessingFile?: string;
  mainAppSchemes?: string[];
  targetsConfig?: any[];
  targetIcon?: string;
}): string {
  const normalized = JSON.stringify(inputs, Object.keys(inputs).sort());
  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Check if prebuild is running with --clean flag
 */
function isCleanMode(): boolean {
  return process.argv.includes('--clean');
}

/**
 * Check if Info.plist is stale and needs regeneration
 */
function isInfoPlistStale(
  infoPlistPath: string,
  currentSignature: string
): boolean {
  if (!fs.existsSync(infoPlistPath)) {
    return true; // Doesn't exist, needs generation
  }

  const metadataPath = infoPlistPath.replace(
    'Info.plist',
    '.infoplist-signature'
  );
  if (!fs.existsSync(metadataPath)) {
    return true; // No signature file, consider stale
  }

  try {
    const storedSignature = fs.readFileSync(metadataPath, 'utf8').trim();
    return storedSignature !== currentSignature;
  } catch {
    return true; // Error reading signature, consider stale
  }
}

/**
 * Store Info.plist signature for future staleness detection
 */
function storeInfoPlistSignature(
  infoPlistPath: string,
  signature: string
): void {
  const metadataPath = infoPlistPath.replace(
    'Info.plist',
    '.infoplist-signature'
  );
  fs.writeFileSync(metadataPath, signature, 'utf8');
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

    props.logger.log(`Adding Xcode target: ${targetName} (${props.type})`);

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

    // NEW APPROACH: Reference files in place, generate metadata in targets/*/ios/build/

    // Ensure build directory exists in targets/
    const targetBuildPath = Paths.getTargetBuildPath({
      projectRoot,
      targetDirectory: props.directory,
    });
    File.ensureDirectoryExists(targetBuildPath);
    props.logger.log(
      `Build directory: ${path.relative(projectRoot, targetBuildPath)}`
    );

    // Generate Info.plist in targets/*/ios/build/
    const infoPlistPath = Paths.getTargetInfoPlistPath({
      projectRoot,
      targetDirectory: props.directory,
    });

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

    // Generate signature from all config inputs
    const configSignature = generateInfoPlistSignature({
      type: props.type,
      entry: props.entry,
      infoPlist: props.infoPlist,
      activationRules: props.activationRules,
      preprocessingFile: props.preprocessingFile,
      mainAppSchemes: mainAppSchemes.length > 0 ? mainAppSchemes : undefined,
      targetsConfig,
      targetIcon: props.targetIcon,
    });

    const cleanMode = isCleanMode();
    const stale = isInfoPlistStale(infoPlistPath, configSignature);

    // Determine if we need to generate Info.plist
    const shouldGenerate = !File.isFile(infoPlistPath) || (!cleanMode && stale);

    if (shouldGenerate) {
      if (stale && File.isFile(infoPlistPath)) {
        props.logger.log(
          `Info.plist configuration changed, regenerating for ${targetName}...`
        );
      } else {
        props.logger.log(`Generating Info.plist for ${targetName}...`);
      }

      if (mainAppSchemes.length > 0) {
        props.logger.log(
          `Extracted ${mainAppSchemes.length} URL scheme(s) from main app config`
        );
        props.logger.log(
          `Auto-injecting LSApplicationQueriesSchemes: ${mainAppSchemes.join(', ')}`
        );
      }

      if (targetsConfig && targetsConfig.length > 0) {
        props.logger.log(
          `Embedding ${targetsConfig.length} target(s) config in ${targetName} Info.plist`
        );
      }

      // Check if activationRules or preprocessingFile exist
      // activationRules can be an array (even empty) or undefined
      const hasActivationRules =
        Array.isArray(props.activationRules) &&
        props.activationRules.length > 0;
      const hasPreprocessingFile = !!props.preprocessingFile;

      const infoPlistContent = getTargetInfoPlistForType(
        props.type,
        props.infoPlist,
        hasActivationRules || hasPreprocessingFile
          ? {
              activationRules: props.activationRules,
              preprocessingFile: props.preprocessingFile,
            }
          : undefined,
        props.entry,
        mainAppSchemes.length > 0 ? mainAppSchemes : undefined,
        targetsConfig,
        props.targetIcon
      );
      File.writeFileSafe(infoPlistPath, infoPlistContent);
      storeInfoPlistSignature(infoPlistPath, configSignature);
      props.logger.log(
        `Generated Info.plist at ${path.relative(projectRoot, infoPlistPath)}`
      );
    } else {
      const reason = cleanMode ? '--clean mode' : 'unchanged configuration';
      props.logger.log(
        `Info.plist reused (${reason}): ${path.relative(projectRoot, infoPlistPath)}`
      );
    }

    // Create iMessage App Icon for sticker pack targets
    if (props.type === 'stickers') {
      const assetsPath = Paths.getTargetAssetsPath({
        projectRoot,
        targetDirectory: props.directory,
        isStickers: true,
      });

      // Create root Contents.json for Stickers.xcassets
      Asset.createAssetsXcassetsRoot(assetsPath);

      const iconsetPath = path.join(
        assetsPath,
        'iMessage App Icon.stickersiconset'
      );

      // Resolve source icon path if provided
      const sourceIconPath = props.targetIcon
        ? path.isAbsolute(props.targetIcon)
          ? props.targetIcon
          : path.join(projectRoot, props.targetIcon)
        : undefined;

      Asset.createIMessageAppIcon({
        iconsetPath,
        sourceIconPath,
      });
      props.logger.log(`Created iMessage App Icon set for ${targetName}`);

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
              props.logger.warn(
                `Sticker asset not found: ${absoluteAssetPath}`
              );
            }
          });

          props.logger.log(
            `Created sticker pack "${stickerPack.name}" with ${stickerPack.assets.length} sticker(s)`
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
      props.logger.log(`Target ${targetProductName} already exists, reusing`);
      target = {
        uuid: existingTargetUuid,
        target:
          xcodeProject.hash.project.objects.PBXNativeTarget[existingTargetUuid],
      };
    } else {
      props.logger.log(`Created native target: ${targetProductName}`);

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
    props.logger.log(`Set product type to ${productType} for ${props.type}`);

    // Remove auto-created build phases for asset-only targets
    if (!typeConfig.requiresCode && !existingTargetUuid) {
      props.logger.log(
        `Removing auto-created code build phases from asset-only target`
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

    props.logger.log(
      `Main app SWIFT_VERSION: ${mainBuildSettings.SWIFT_VERSION || 'NOT SET'}`
    );

    // Build settings that should be target-specific
    const targetSpecificSettings: Record<string, string> = {
      PRODUCT_NAME: `"${targetProductName}"`,
      PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
      // INFOPLIST_FILE will be set later to point to targets/*/ios/build/Info.plist
    };

    // Only code-based targets need entitlements - generate in build directory
    if (typeConfig.requiresEntitlements) {
      const entitlementsPath = Paths.getTargetEntitlementsPath({
        projectRoot,
        targetDirectory: props.directory,
      });
      const relativeEntitlementsPath = path.relative(
        platformProjectRoot,
        entitlementsPath
      );
      targetSpecificSettings.CODE_SIGN_ENTITLEMENTS = `"${relativeEntitlementsPath}"`;
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
        props.logger.log(`Inherited ${setting}: ${mainBuildSettings[setting]}`);
      }
    });

    // Build final settings: target-specific + inherited + deployment target + custom overrides
    const buildSettings: Record<string, string> = {
      ...targetSpecificSettings,
    };

    // SWIFT_VERSION required even for asset-only targets
    if (props.swiftVersion !== undefined) {
      buildSettings.SWIFT_VERSION = String(props.swiftVersion);
      props.logger.log(`Using custom SWIFT_VERSION: ${props.swiftVersion}`);
    } else if (mainBuildSettings.SWIFT_VERSION) {
      buildSettings.SWIFT_VERSION = mainBuildSettings.SWIFT_VERSION;
      props.logger.log(
        `Inherited SWIFT_VERSION: ${mainBuildSettings.SWIFT_VERSION}`
      );
    } else {
      buildSettings.SWIFT_VERSION = '5.0';
      props.logger.log(`Using fallback SWIFT_VERSION: 5.0`);
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
          props.logger.log(`Using custom ${xcodeKey}: ${props[prop]}`);
        } else if (mainBuildSettings[xcodeKey]) {
          buildSettings[xcodeKey] = mainBuildSettings[xcodeKey];
          props.logger.log(
            `Inherited ${xcodeKey}: ${mainBuildSettings[xcodeKey]}`
          );
        }
      });
    } else {
      props.logger.log(
        `Skipping code-related build settings for asset-only target`
      );

      // Sticker packs need asset catalog compiler settings
      if (props.type === 'stickers') {
        buildSettings.ASSETCATALOG_COMPILER_APPICON_NAME =
          '"iMessage App Icon"';
        props.logger.log(
          `Set ASSETCATALOG_COMPILER_APPICON_NAME for sticker pack`
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

    props.logger.log(
      `Final SWIFT_VERSION for ${targetProductName}: ${buildSettings.SWIFT_VERSION}`
    );

    // Apply build settings to target
    Xcode.applyBuildSettings({
      project: xcodeProject,
      target,
      buildSettings,
      verbose: true,
      logger: props.logger,
    });

    // Standalone apps should not have SKIP_INSTALL
    Xcode.removeBuildSetting({
      project: xcodeProject,
      target,
      settingKey: 'SKIP_INSTALL',
      verbose: true,
      logger: props.logger,
    });

    props.logger.log(`Configured build settings for ${targetProductName}`);

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
        props.logger.log(
          `Created Sources build phase for ${targetProductName}`
        );
      } else {
        props.logger.log(
          `Sources build phase already exists for ${targetProductName}`
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
        props.logger.log(
          `Created Frameworks build phase for ${targetProductName}`
        );
      } else {
        props.logger.log(
          `Frameworks build phase already exists for ${targetProductName}`
        );
      }
    } else {
      props.logger.log(
        `Skipping Sources and Frameworks build phases for asset-only target`
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
      props.logger.log(
        `Created Resources build phase for ${targetProductName}`
      );
    } else {
      props.logger.log(
        `Resources build phase already exists for ${targetProductName}`
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
          ignore: [
            '**/Tests/**',
            '**/*.test.swift',
            '**/*Tests.swift',
            '**/build/**', // Exclude build directory - those are generated files
          ],
        }).filter(
          (file) =>
            !file.includes('Tests/') &&
            !file.includes('/Tests') &&
            !file.endsWith('.test.swift') &&
            !file.endsWith('Tests.swift') &&
            !file.startsWith('build/') // Also filter out build/ files that might slip through
        )
      : [];

    // Auto-generate ReactNativeViewController.swift if using React Native without user Swift files
    if (props.entry && swiftFiles.length === 0) {
      props.logger.log(
        `No Swift files found - generating ReactNativeViewController.swift for React Native`
      );

      const moduleName = targetProductName;
      // ReactNativeViewController will be generated in the build directory
      // when processing Swift files below
      swiftFiles = ['ReactNativeViewController.swift'];

      props.logger.log(
        `Will generate ReactNativeViewController.swift for ${moduleName}`
      );
    } else if (props.entry && swiftFiles.length > 0) {
      props.logger.log(
        `Using user-provided Swift files with React Native entry point`
      );
    }

    props.logger.log(
      `Found ${swiftFiles.length} Swift file(s) in ${props.directory}/ios`
    );

    // Create virtual expo:targets group structure in Xcode
    const virtualGroupUuid = Xcode.ensureExpoTargetsGroup({
      project: xcodeProject,
    });
    const targetGroupUuid = Xcode.addTargetToVirtualGroup({
      project: xcodeProject,
      targetName,
      virtualGroupUuid,
    });
    props.logger.log(`Created virtual group: expo:targets/${targetName}`);

    // Reference Swift files in place (no copying)
    swiftFiles.forEach((file) => {
      let sourceFilePath: string;

      // Check if this is ReactNativeViewController.swift (could be in build/ or root)
      const isReactNativeViewController =
        file === 'ReactNativeViewController.swift' ||
        file.endsWith('/ReactNativeViewController.swift') ||
        file.endsWith('\\ReactNativeViewController.swift');

      if (props.entry && isReactNativeViewController) {
        // Generated file - always regenerate on every prebuild (no caching)
        // Check if user has their own file in ios/ (not build/)
        const userFilePath = path.join(
          projectRoot,
          props.directory,
          'ios',
          'ReactNativeViewController.swift'
        );
        if (fs.existsSync(userFilePath)) {
          // User provided their own - reference it in place
          sourceFilePath = userFilePath;
          props.logger.log(
            `  Using user-provided: ReactNativeViewController.swift`
          );
        } else {
          // Generate fresh template file - always regenerate
          sourceFilePath = path.join(
            targetBuildPath,
            'ReactNativeViewController.swift'
          );
          const moduleName = targetProductName.replace('Target', '');
          const template = ReactNativeSwift.generateReactNativeViewController({
            type: props.type,
            moduleName,
            targetName: props.name,
            preprocessingFile: props.preprocessingFile,
            entry: props.entry,
          });
          File.writeFileSafe(sourceFilePath, template);
          props.logger.log(
            `  Generated: ReactNativeViewController.swift in build directory (regenerated)`
          );
        }
      } else {
        // User file - reference in place
        sourceFilePath = path.join(projectRoot, props.directory, 'ios', file);

        if (!fs.existsSync(sourceFilePath)) {
          throw new Error(
            `Swift file not found: ${sourceFilePath}\n` +
              `Expected at: ${path.relative(projectRoot, sourceFilePath)}`
          );
        }

        // Validate that file is within the target directory (security check)
        const targetDirPath = path.join(projectRoot, props.directory, 'ios');
        const normalizedFilePath = path.normalize(sourceFilePath);
        const normalizedTargetDir = path.normalize(targetDirPath);

        if (!normalizedFilePath.startsWith(normalizedTargetDir)) {
          throw new Error(
            `Swift file is outside target directory: ${file}\n` +
              `Expected in: ${path.relative(projectRoot, targetDirPath)}`
          );
        }

        // Skip test files even if they weren't caught by glob ignore
        if (
          file.includes('Tests/') ||
          file.includes('/Tests') ||
          file.endsWith('.test.swift') ||
          file.endsWith('Tests.swift')
        ) {
          props.logger.log(`  Skipping test file: ${file}`);
          return;
        }
      }

      // Add file reference (not copy)
      const relativePath = path.relative(platformProjectRoot, sourceFilePath);
      const fileRefUuid = Xcode.addExternalFileReference({
        project: xcodeProject,
        groupUuid: targetGroupUuid,
        filePath: relativePath,
        fileName: file,
      });

      // Add to Sources build phase
      Xcode.addFileToBuildPhase({
        project: xcodeProject,
        targetUuid: target.uuid,
        fileRefUuid,
        phaseType: 'PBXSourcesBuildPhase',
      });

      props.logger.log(`  Referenced: ${file}`);
    });

    // Handle Assets.xcassets - copy user assets to build directory, then reference
    const userAssetsPath = path.join(
      projectRoot,
      props.directory,
      'ios',
      props.type === 'stickers' ? 'Stickers.xcassets' : 'Assets.xcassets'
    );
    const buildAssetsPath = Paths.getTargetAssetsPath({
      projectRoot,
      targetDirectory: props.directory,
      isStickers: props.type === 'stickers',
    });

    // Copy user assets to build directory if they exist
    if (File.isDirectory(userAssetsPath)) {
      File.copyDirectorySafe(userAssetsPath, buildAssetsPath);
      props.logger.log(`Copied user assets to build directory`);
    } else {
      // Create empty assets directory
      File.ensureDirectoryExists(buildAssetsPath);
      Asset.createAssetsXcassetsRoot(buildAssetsPath);
    }

    // Generate colors in build assets if specified
    if (props.colors && Object.keys(props.colors).length > 0) {
      Object.entries(props.colors).forEach(([colorName, colorValue]) => {
        const colorsetPath = Paths.getTargetColorsetPath({
          projectRoot,
          targetDirectory: props.directory,
          colorName,
        });
        if (typeof colorValue === 'string') {
          Asset.createColorset({
            colorsetPath,
            color: colorValue,
          });
        } else {
          const lightColor =
            (colorValue as any).light || (colorValue as any).color;
          const darkColor =
            (colorValue as any).dark || (colorValue as any).darkColor;
          Asset.createColorset({
            colorsetPath,
            color: lightColor,
            darkColor,
          });
        }
      });
      props.logger.log(
        `Generated ${Object.keys(props.colors).length} color assets`
      );
    }

    // Reference assets from build directory
    if (File.isDirectory(buildAssetsPath)) {
      const relativeAssetsPath = path.relative(
        platformProjectRoot,
        buildAssetsPath
      );
      const assetsFileRefUuid = Xcode.addExternalFileReference({
        project: xcodeProject,
        groupUuid: targetGroupUuid,
        filePath: relativeAssetsPath,
        fileName: path.basename(buildAssetsPath),
        fileType: 'folder.assetcatalog',
      });

      Xcode.addFileToBuildPhase({
        project: xcodeProject,
        targetUuid: target.uuid,
        fileRefUuid: assetsFileRefUuid,
        phaseType: 'PBXResourcesBuildPhase',
      });
      props.logger.log(`Referenced assets from build directory`);
    }

    // Update INFOPLIST_FILE build setting to point to targets/
    const relativeInfoPlistPath = path.relative(
      platformProjectRoot,
      infoPlistPath
    );
    Xcode.applyBuildSettings({
      project: xcodeProject,
      target,
      buildSettings: {
        INFOPLIST_FILE: `"${relativeInfoPlistPath}"`,
      },
    });
    props.logger.log(`Info.plist referenced from: ${relativeInfoPlistPath}`);

    // Link frameworks (skip for asset-only targets)
    if (typeConfig.requiresCode && frameworks.length > 0) {
      frameworks.forEach((framework) => {
        props.logger.log(`  Linking framework: ${framework}`);
        xcodeProject.addFramework(`${framework}.framework`, {
          target: target.uuid,
          link: true,
        });
      });
    } else if (!typeConfig.requiresCode) {
      props.logger.log(`Skipping framework linking for asset-only target`);
    }

    // Add target dependency for app extensions and clips
    props.logger.log(`Adding target dependency to main app`);

    Xcode.addTargetDependency({
      project: xcodeProject,
      mainTargetUuid: mainTarget.uuid,
      dependentTargetUuid: target.uuid,
    });

    // Configure embedding based on extension embed type
    if (typeConfig.embedType === 'foundation-extension') {
      props.logger.log(`Configuring "Embed Foundation Extensions" build phase`);
      Xcode.configureAppExtensionEmbed({
        project: xcodeProject,
        targetProductName,
      });
    } else if (typeConfig.embedType === 'app-clip') {
      props.logger.log(`Creating "Embed App Clips" build phase`);
      Xcode.configureAppClipEmbed({
        project: xcodeProject,
        mainTargetUuid: mainTarget.uuid,
        target,
        targetProductName,
      });
    }
    // 'none' embedType = no embedding configuration needed (e.g., watch apps)

    props.logger.logSparse(true, `Configured target`, targetName);

    return config;
  });
};
