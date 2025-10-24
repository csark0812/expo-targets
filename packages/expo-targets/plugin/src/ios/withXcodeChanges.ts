import {
  ConfigPlugin,
  withXcodeProject,
  XcodeProject,
} from '@expo/config-plugins';
import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';

import type { ExtensionType, IOSTargetConfigWithReactNative } from '../config';
import {
  productTypeForType,
  getFrameworksForType,
  getTargetInfoPlistForType,
} from './target';

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
    const targetDirectory = path.join(projectRoot, props.directory, 'ios');
    const targetName = props.displayName || props.name;

    console.log(
      `[expo-targets] Adding Xcode target: ${targetName} (${props.type})`
    );

    const mainBundleId = config.ios?.bundleIdentifier;
    if (!mainBundleId) {
      throw new Error('iOS bundle identifier not found in app.json');
    }

    // Sanitize target name for bundle identifier (no hyphens or special chars)
    const bundleIdentifierSuffix = props.name.replace(/[^a-zA-Z0-9]/g, '');
    const bundleIdentifier =
      props.bundleIdentifier || `${mainBundleId}.${bundleIdentifierSuffix}`;
    const deploymentTarget = props.deploymentTarget || '18.0';
    const productType = productTypeForType(props.type);
    const frameworks = [
      ...(getFrameworksForType(props.type) || []),
      ...(props.frameworks || []),
    ];

    // Generate Info.plist in build folder if it doesn't exist
    const buildDirectory = path.join(targetDirectory, 'build');
    const infoPlistPath = path.join(buildDirectory, 'Info.plist');
    if (!fs.existsSync(infoPlistPath)) {
      const infoPlistContent = getTargetInfoPlistForType(props.type);
      fs.mkdirSync(buildDirectory, { recursive: true });
      fs.writeFileSync(infoPlistPath, infoPlistContent);
      console.log(`[expo-targets] Generated Info.plist for ${targetName}`);
    }

    const pbxProject = config.modResults;
    const xcodeProject = pbxProject as any;

    // Get main app target
    const mainTarget = xcodeProject.getFirstTarget();
    if (!mainTarget) {
      throw new Error('Could not find main app target');
    }

    // Create the extension target
    const targetProductName = targetName.replace(/[^a-zA-Z0-9]/g, '');

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
      const nativeTarget = target.pbxNativeTarget || target.target;
      if (nativeTarget) {
        nativeTarget.productType = productType;
        console.log(
          `[expo-targets] Set product type to ${productType} for App Clip`
        );
      }
    }

    // Get main app's build settings to inherit from
    // getFirstTarget() returns { uuid, target } where target is the pbxNativeTarget
    const mainTargetBuildConfigId = mainTarget.target?.buildConfigurationList;
    const mainBuildConfigList =
      xcodeProject.pbxXCConfigurationList()[mainTargetBuildConfigId];
    const mainBuildConfig =
      mainBuildConfigList?.buildConfigurations?.[0]?.value;
    const mainBuildSettings = mainBuildConfig
      ? xcodeProject.pbxXCBuildConfigurationSection()[mainBuildConfig]
          ?.buildSettings || {}
      : {};

    console.log(
      `[expo-targets] Main app SWIFT_VERSION: ${mainBuildSettings.SWIFT_VERSION || 'NOT SET'}`
    );

    // Build settings that should be target-specific
    const targetSpecificSettings: Record<string, string> = {
      PRODUCT_NAME: `"${targetProductName}"`,
      PRODUCT_BUNDLE_IDENTIFIER: bundleIdentifier,
      INFOPLIST_FILE: `${targetProductName}/Info.plist`,
      CODE_SIGN_ENTITLEMENTS: `${targetProductName}/generated.entitlements`,
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

    // Add linker flags for App Clips
    if (props.type === 'clip') {
      // App Clips are standalone - completely isolate from parent app's Pods
      // CRITICAL: Use separate build directory to avoid finding main app's Pods
      buildSettings.CONFIGURATION_BUILD_DIR =
        '"$(BUILD_DIR)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)-$(TARGET_NAME)"';
      buildSettings.OBJROOT = '"$(PROJECT_TEMP_DIR)/$(TARGET_NAME).build"';

      // Do NOT use $(inherited) to avoid pulling in any Pods references
      buildSettings.LD_RUNPATH_SEARCH_PATHS =
        '"@executable_path/Frameworks /usr/lib/swift"';
      // Clear Swift flags - no inherited module paths from main app
      // Disable automatic framework linking in Swift to prevent UIUtilities/SwiftUICore
      // Use array format - combine flag and argument to prevent Swift treating them as separate inputs
      buildSettings.OTHER_SWIFT_FLAGS = [
        '"-D"',
        '"EXPO_CONFIGURATION_$(CONFIGURATION)"',
        '"-disable-autolink-framework UIUtilities"',
        '"-disable-autolink-framework SwiftUICore"',
      ] as any;
      // App Clips must embed Swift libraries since they're standalone
      buildSettings.ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = 'YES';

      // CRITICAL: Override ALL search paths - Xcode auto-adds build dirs otherwise
      // Only search system frameworks, never the shared build directory
      buildSettings.FRAMEWORK_SEARCH_PATHS =
        '"$(SDKROOT)/System/Library/Frameworks"';
      buildSettings.SYSTEM_FRAMEWORK_SEARCH_PATHS =
        '"$(SDKROOT)/System/Library/Frameworks"';

      // Prevent Swift auto-linking problematic frameworks by clearing linker flags
      // Swift auto-linker is finding UIUtilities/SwiftUICore references somewhere
      buildSettings.OTHER_LDFLAGS = '""';

      // Keep Clang modules enabled (needed for Swift) but control auto-linking via Swift flags

      // Explicitly disable automatic framework search path additions
      buildSettings.ENABLE_DEFAULT_SEARCH_PATHS = 'NO';

      // Only allow Swift stdlib, nothing else
      buildSettings.LIBRARY_SEARCH_PATHS =
        '"$(TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)"';
      buildSettings.HEADER_SEARCH_PATHS = '""';
      buildSettings.SWIFT_INCLUDE_PATHS = '""';
      buildSettings.USER_HEADER_SEARCH_PATHS = '""';
    }

    console.log(
      `[expo-targets] Final SWIFT_VERSION for ${targetProductName}: ${buildSettings.SWIFT_VERSION}`
    );

    // Get build configuration list for the target
    // addTarget() returns { uuid, pbxNativeTarget }
    const targetBuildConfigId =
      target.pbxNativeTarget?.buildConfigurationList ||
      target.target?.buildConfigurationList;
    const buildConfigList =
      xcodeProject.pbxXCConfigurationList()[targetBuildConfigId];

    if (buildConfigList && buildConfigList.buildConfigurations) {
      buildConfigList.buildConfigurations.forEach((config: any) => {
        const configSection =
          xcodeProject.pbxXCBuildConfigurationSection()[config.value];
        const configName = configSection?.name;
        console.log(
          `[expo-targets]   Configuring ${configName} build settings`
        );

        if (configSection && configSection.buildSettings) {
          // Directly modify the buildSettings object
          Object.entries(buildSettings).forEach(([key, value]) => {
            configSection.buildSettings[key] = value;
            if (key === 'SWIFT_VERSION') {
              console.log(
                `[expo-targets]     Set ${key}=${value} to ${configName}`
              );
            }
          });

          // App Clips should not have SKIP_INSTALL - they're standalone apps
          if (
            props.type === 'clip' &&
            configSection.buildSettings.SKIP_INSTALL
          ) {
            delete configSection.buildSettings.SKIP_INSTALL;
            console.log(`[expo-targets]     Removed SKIP_INSTALL for App Clip`);
          }
        }
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

    // Copy Swift files and Info.plist into ios/ directory
    // Note: Files copied to ios/{target}/ for Xcode accessibility
    const targetGroupPath = path.join(
      config.modRequest.platformProjectRoot,
      targetProductName
    );
    fs.mkdirSync(targetGroupPath, { recursive: true });

    // Copy Info.plist from build folder
    const infoPlistSource = path.join(buildDirectory, 'Info.plist');
    const infoPlistDest = path.join(targetGroupPath, 'Info.plist');
    if (fs.existsSync(infoPlistSource)) {
      fs.copyFileSync(infoPlistSource, infoPlistDest);
      console.log(`[expo-targets] Copied Info.plist to ${targetProductName}/`);
    }

    // Copy generated.entitlements from build folder
    const entitlementsSource = path.join(
      buildDirectory,
      'generated.entitlements'
    );
    const entitlementsDest = path.join(
      targetGroupPath,
      'generated.entitlements'
    );
    if (fs.existsSync(entitlementsSource)) {
      fs.copyFileSync(entitlementsSource, entitlementsDest);
      console.log(
        `[expo-targets] Copied generated.entitlements to ${targetProductName}/`
      );
    }

    const swiftFiles = globSync('**/*.swift', {
      cwd: targetDirectory,
      absolute: false,
    });

    console.log(
      `[expo-targets] Found ${swiftFiles.length} Swift file(s) in ${props.directory}/ios`
    );

    // Create an empty PBXGroup for the target
    let groupKey = targetProductName;
    if (swiftFiles.length > 0) {
      const groupResult = xcodeProject.addPbxGroup(
        [],
        targetProductName,
        targetProductName
      );
      groupKey = groupResult.uuid;
      console.log(
        `[expo-targets] Created group: ${targetProductName} (${groupKey})`
      );
    }

    swiftFiles.forEach((file) => {
      const sourceFile = path.join(targetDirectory, file);
      const destFile = path.join(targetGroupPath, path.basename(file));

      fs.copyFileSync(sourceFile, destFile);
      console.log(`[expo-targets]   Copied: ${file} -> ${targetProductName}/`);

      // Add the file to the target's Sources build phase
      const relativePath = path.relative(
        config.modRequest.platformProjectRoot,
        destFile
      );
      xcodeProject.addSourceFile(
        relativePath,
        { target: target.uuid },
        groupKey
      );
      console.log(
        `[expo-targets]   Added to build phase: ${path.basename(file)}`
      );
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
    xcodeProject.addTargetDependency(mainTarget.uuid, [target.uuid]);

    // App Clips and Extensions need different embed settings
    if (props.type !== 'clip') {
      // The addTarget function creates a "Copy Files" phase but doesn't add proper settings
      // We need to add RemoveHeadersOnCopy attribute to the PBXBuildFile
      console.log(
        `[expo-targets] Configuring "Embed App Extensions" build phase`
      );

      const buildFileSection = xcodeProject.hash.project.objects.PBXBuildFile;
      const fileRefSection = xcodeProject.hash.project.objects.PBXFileReference;

      // Find the PBXBuildFile that references our extension and add settings
      let foundBuildFile = false;
      for (const buildFileKey in buildFileSection) {
        if (buildFileKey.endsWith('_comment')) continue;

        const buildFile = buildFileSection[buildFileKey];
        if (buildFile && buildFile.fileRef) {
          const fileRef = fileRefSection[buildFile.fileRef];
          // Check both path and name properties, and handle quoted values
          const refPath = fileRef?.path?.replace(/"/g, '');
          const refName = fileRef?.name?.replace(/"/g, '');
          const targetFileName = `${targetProductName}.appex`;

          if (refPath === targetFileName || refName === targetFileName) {
            // Add the required settings for app extension embedding
            buildFile.settings = {
              ATTRIBUTES: ['RemoveHeadersOnCopy'],
            };
            console.log(
              `[expo-targets] Added RemoveHeadersOnCopy attribute to ${targetProductName}.appex`
            );
            foundBuildFile = true;
            break;
          }
        }
      }

      if (!foundBuildFile) {
        console.log(
          `[expo-targets] Warning: Could not find PBXBuildFile for ${targetProductName}.appex`
        );
      }

      // Rename the Copy Files phase to "Embed App Extensions"
      const copyFilesPhases =
        xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase;

      for (const phaseKey in copyFilesPhases) {
        if (phaseKey.endsWith('_comment')) continue;

        const phase = copyFilesPhases[phaseKey];
        if (phase && phase.dstSubfolderSpec === 13 && phase.files) {
          // Check if this phase contains our extension
          const hasOurExtension = phase.files.some((file: any) => {
            const buildFileKey = file.value;
            const buildFile = buildFileSection?.[buildFileKey];
            if (buildFile) {
              const fileRef = fileRefSection?.[buildFile.fileRef];
              if (fileRef && fileRef.path === `${targetProductName}.appex`) {
                return true;
              }
            }
            return false;
          });

          if (hasOurExtension) {
            const commentKey = `${phaseKey}_comment`;
            copyFilesPhases[commentKey] = 'Embed App Extensions';
            phase.name = '"Embed App Extensions"';
            console.log(
              `[expo-targets] Renamed Copy Files phase to "Embed App Extensions"`
            );
            break;
          }
        }
      }
    } else {
      // App Clips embedding - manually create Copy Files phase
      console.log(`[expo-targets] Creating "Embed App Clips" build phase`);

      // Get the App Clip product reference from the target
      const appClipFileRef =
        target.pbxNativeTarget?.productReference ||
        target.target?.productReference;

      if (!appClipFileRef) {
        console.log(
          `[expo-targets] Error: Could not find product reference for ${targetProductName}.app`
        );
      } else {
        // Create Copy Files build phase manually
        const embedPhaseResult = xcodeProject.addBuildPhase(
          [],
          'PBXCopyFilesBuildPhase',
          'Embed App Clips',
          mainTarget.uuid
        );

        const embedPhaseUuid = embedPhaseResult?.uuid || embedPhaseResult;

        console.log(
          `[expo-targets] addBuildPhase returned UUID: ${embedPhaseUuid}`
        );

        if (embedPhaseUuid) {
          const copyFilesPhases =
            xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase;
          const phase = copyFilesPhases[embedPhaseUuid];

          if (phase) {
            console.log(`[expo-targets] Found phase object, configuring...`);

            // Configure phase for App Clips
            phase.dstSubfolderSpec = '16'; // App Clips folder
            phase.dstPath = '""';
            phase.name = '"Embed App Clips"';

            // Create a PBXBuildFile for the App Clip manually
            const buildFileUuid = xcodeProject.generateUuid();

            const buildFileSection =
              xcodeProject.hash.project.objects.PBXBuildFile;
            buildFileSection[buildFileUuid] = {
              isa: 'PBXBuildFile',
              fileRef: appClipFileRef,
              settings: {
                ATTRIBUTES: ['RemoveHeadersOnCopy'],
              },
            };
            buildFileSection[`${buildFileUuid}_comment`] =
              `${targetProductName}.app in Embed App Clips`;

            console.log(
              `[expo-targets] Created build file UUID: ${buildFileUuid}`
            );

            // Add the build file to the phase
            if (!phase.files) {
              phase.files = [];
            }
            phase.files.push({
              value: buildFileUuid,
              comment: `${targetProductName}.app in Embed App Clips`,
            });

            console.log(
              `[expo-targets] Created "Embed App Clips" build phase with ${targetProductName}.app`
            );
          } else {
            console.log(
              `[expo-targets] Could not find phase object for UUID: ${embedPhaseUuid}`
            );
          }
        } else {
          console.log(`[expo-targets] addBuildPhase returned no UUID`);
        }
      }
    }

    console.log(`[expo-targets] Successfully configured ${targetName} target`);

    return config;
  });
};
