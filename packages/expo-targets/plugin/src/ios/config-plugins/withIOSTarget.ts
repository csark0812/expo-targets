import { ConfigPlugin } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import { withTargetEntitlements } from './withEntitlements';
import { withIosColorset } from './withIosColorset';
import { withTargetPodfile } from './withPodfile';
import { withXcodeChanges } from './withXcodeChanges';
import {
  TYPE_MINIMUM_DEPLOYMENT_TARGETS,
  type ExtensionType,
  type IOSTargetConfigWithReactNative,
  type Color,
} from '../../config';

interface IOSTargetProps extends IOSTargetConfigWithReactNative {
  type: ExtensionType;
  name: string;
  displayName?: string;
  appGroup?: string;
  directory: string;
  configPath: string;
}

export const withIOSTarget: ConfigPlugin<IOSTargetProps> = (config, props) => {
  // Validate React Native compatibility
  const REACT_NATIVE_COMPATIBLE_TYPES: ExtensionType[] = [
    'share',
    'action',
    'clip',
  ];

  // Validate entry field
  if (props.entry) {
    if (!REACT_NATIVE_COMPATIBLE_TYPES.includes(props.type)) {
      throw new Error(
        `Target '${props.name}' (type: ${props.type}) does not support React Native. ` +
          `'entry' can only be used with: ${REACT_NATIVE_COMPATIBLE_TYPES.join(', ')}`
      );
    }

    // Validate that the entry file exists
    const projectRoot = config._internal?.projectRoot || process.cwd();
    const entryPath = path.resolve(projectRoot, props.entry);
    if (!fs.existsSync(entryPath)) {
      throw new Error(
        `Target '${props.name}': Entry file not found at ${props.entry}. ` +
          `Resolved path: ${entryPath}`
      );
    }
  }

  // Validate excludedPackages
  if (props.excludedPackages && !props.entry) {
    console.warn(
      `[expo-targets] excludedPackages specified for ${props.name} but no 'entry' field provided. ` +
        `excludedPackages will be ignored.`
    );
  }

  // Resolve appGroup (inherit from main app if not specified)
  let appGroup = props.appGroup;
  if (!appGroup) {
    const mainAppGroups =
      config.ios?.entitlements?.['com.apple.security.application-groups'];
    if (Array.isArray(mainAppGroups) && mainAppGroups.length > 0) {
      appGroup = mainAppGroups[0];
      console.log(`[expo-targets] Inherited App Group: ${appGroup}`);
    }
  }

  // Validate App Group for types that require it
  const REQUIRES_APP_GROUP: ExtensionType[] = [
    'widget',
    'clip',
    'share',
    'bg-download',
  ];
  if (REQUIRES_APP_GROUP.includes(props.type) && !appGroup) {
    throw new Error(
      `Target '${props.name}' (type: ${props.type}) requires an App Group. ` +
        `Specify 'appGroup' in defineTarget() or add App Groups to main app entitlements in app.json`
    );
  }

  // Resolve deploymentTarget (type-aware default)
  const typeMinimum =
    TYPE_MINIMUM_DEPLOYMENT_TARGETS[
      props.type as keyof typeof TYPE_MINIMUM_DEPLOYMENT_TARGETS
    ];
  const mainAppTarget = (config.ios as any)?.deploymentTarget;
  let deploymentTarget = props.deploymentTarget;

  if (!deploymentTarget) {
    if (mainAppTarget && parseFloat(mainAppTarget) > parseFloat(typeMinimum)) {
      deploymentTarget = mainAppTarget;
      console.log(
        `[expo-targets] Inherited deployment target: ${deploymentTarget}`
      );
    } else {
      deploymentTarget = typeMinimum;
      console.log(
        `[expo-targets] Using type minimum deployment target: ${deploymentTarget}`
      );
    }
  }

  // Inherit accent color
  const colors = props.colors || {};
  const mainAppAccentColor = (config.ios as any)?.accentColor;
  if (!colors.$accent && mainAppAccentColor) {
    colors.$accent = mainAppAccentColor;
    console.log(`[expo-targets] Inherited accent color: ${mainAppAccentColor}`);
  }

  const targetName = props.displayName || props.name;
  // Sanitize target name for Xcode (matches withXcodeChanges logic)
  const targetProductName = targetName.replace(/[^a-zA-Z0-9]/g, '');

  // Pass resolved values to withXcodeChanges
  config = withXcodeChanges(config, {
    ...props,
    deploymentTarget,
    colors: Object.keys(colors).length > 0 ? colors : undefined,
  });

  // Add Podfile target only for targets that use React Native
  // App Clips and other extensions without RN should be standalone (no Pods)
  if (props.entry) {
    config = withTargetPodfile(config, {
      targetName: targetProductName, // Use sanitized name to match Xcode target
      deploymentTarget: deploymentTarget!, // Guaranteed to be set by resolution logic above
      excludedPackages: props.excludedPackages,
    });
  } else {
    console.log(
      `[expo-targets] Skipping Podfile target for ${targetProductName} - standalone target without React Native`
    );
  }

  config = withTargetEntitlements(config, {
    targetName,
    type: props.type,
    entitlements: props.entitlements,
  });

  if (colors && Object.keys(colors).length > 0) {
    Object.entries(colors).forEach(([colorName, colorValue]) => {
      if (typeof colorValue === 'string') {
        config = withIosColorset(config, {
          name: colorName,
          color: colorValue,
          targetName,
        });
      } else {
        const colorObj = colorValue as Color;
        const lightColor = colorObj.light || colorObj.color;
        const darkColor = colorObj.dark || colorObj.darkColor;

        if (lightColor) {
          config = withIosColorset(config, {
            name: colorName,
            color: lightColor,
            darkColor,
            targetName,
          });
        }
      }
    });

    // Note: Assets.xcassets is added in withXcodeChanges where we have direct access to target.uuid
    // Note: Sticker packs are also created in withXcodeChanges for proper execution order
  }

  return config;
};
