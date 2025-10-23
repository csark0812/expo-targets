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

    // Generate Info.plist if it doesn't exist
    const infoPlistPath = path.join(targetDirectory, 'Info.plist');
    if (!fs.existsSync(infoPlistPath)) {
      const infoPlistContent = getTargetInfoPlistForType(props.type);
      fs.mkdirSync(targetDirectory, { recursive: true });
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
      SKIP_INSTALL: 'YES',
    };

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

    // Copy Swift files and Info.plist into ios/ directory
    // Note: Files copied to ios/{target}/ for Xcode accessibility
    const targetGroupPath = path.join(
      config.modRequest.platformProjectRoot,
      targetProductName
    );
    fs.mkdirSync(targetGroupPath, { recursive: true });

    // Copy Info.plist
    const infoPlistSource = path.join(targetDirectory, 'Info.plist');
    const infoPlistDest = path.join(targetGroupPath, 'Info.plist');
    if (fs.existsSync(infoPlistSource)) {
      fs.copyFileSync(infoPlistSource, infoPlistDest);
      console.log(`[expo-targets] Copied Info.plist to ${targetProductName}/`);
    }

    // Copy generated.entitlements
    const entitlementsSource = path.join(
      targetDirectory,
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

    // Add target dependency for app extensions (not clips)
    if (props.type !== 'clip') {
      console.log(`[expo-targets] Adding target dependency to main app`);
      xcodeProject.addTargetDependency(mainTarget.uuid, [target.uuid]);

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
    }

    console.log(`[expo-targets] Successfully configured ${targetName} target`);

    return config;
  });
};
