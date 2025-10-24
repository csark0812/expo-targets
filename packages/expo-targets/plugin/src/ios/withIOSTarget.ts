import { ConfigPlugin } from '@expo/config-plugins';

import { withTargetEntitlements } from './withEntitlements';
import { withIosColorset } from './withIosColorset';
import { withTargetPodfile } from './withPodfile';
import { withTargetAssets } from './withTargetAssets';
import { withXcodeChanges } from './withXcodeChanges';
import {
  TYPE_MINIMUM_DEPLOYMENT_TARGETS,
  type ExtensionType,
  type IOSTargetConfigWithReactNative,
  type Color,
} from '../config';

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

  if (
    props.useReactNative &&
    !REACT_NATIVE_COMPATIBLE_TYPES.includes(props.type)
  ) {
    throw new Error(
      `Target '${props.name}' (type: ${props.type}) does not support React Native. ` +
        `useReactNative can only be used with: ${REACT_NATIVE_COMPATIBLE_TYPES.join(', ')}`
    );
  }

  if (props.excludedPackages && !props.useReactNative) {
    console.warn(
      `[expo-targets] excludedPackages specified for ${props.name} but useReactNative is false. ` +
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
  if (props.useReactNative) {
    config = withTargetPodfile(config, {
      targetName: targetProductName, // Use sanitized name to match Xcode target
      deploymentTarget: deploymentTarget!, // Guaranteed to be set by resolution logic above
      useReactNative: props.useReactNative,
      excludedPackages: props.excludedPackages,
    });
  } else {
    console.log(
      `[expo-targets] Skipping Podfile target for ${targetProductName} - standalone target without React Native`
    );
  }

  config = withTargetEntitlements(config, {
    targetName,
    targetDirectory: props.directory,
    type: props.type,
    entitlements: props.entitlements,
  });

  if (colors && Object.keys(colors).length > 0) {
    Object.entries(colors).forEach(([colorName, colorValue]) => {
      if (typeof colorValue === 'string') {
        config = withIosColorset(config, {
          name: colorName,
          color: colorValue,
          targetDirectory: props.directory,
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
            targetDirectory: props.directory,
          });
        }
      }
    });

    // Copy Assets.xcassets to Xcode project after all colorsets are created
    config = withTargetAssets(config, {
      targetName,
      targetDirectory: props.directory,
    });
  }

  return config;
};
