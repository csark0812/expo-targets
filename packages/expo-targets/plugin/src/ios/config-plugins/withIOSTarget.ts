import { ConfigPlugin } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import { withTargetEntitlements } from './withEntitlements';
import { withTargetPodfile } from './withPodfile';
import { withXcodeChanges } from './withXcodeChanges';
import {
  TYPE_MINIMUM_DEPLOYMENT_TARGETS,
  type ExtensionType,
  type IOSTargetConfigWithReactNative,
} from '../../config';
import { Logger } from '../../logger';
import { Paths } from '../utils';

interface IOSTargetProps extends IOSTargetConfigWithReactNative {
  type: ExtensionType;
  name: string;
  displayName?: string;
  appGroup?: string;
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

export const withIOSTarget: ConfigPlugin<IOSTargetProps> = (config, props) => {
  const targetName = props.displayName || props.name;
  props.logger.log(`Configuring iOS target: ${targetName} (${props.type})`);

  // Validate React Native compatibility
  // Native RN types run actual React Native with native modules
  const REACT_NATIVE_NATIVE_TYPES: ExtensionType[] = [
    'share',
    'action',
    'clip',
    'messages',
  ];

  // Web-based RN types run React Native Web in a web view
  const REACT_NATIVE_WEB_TYPES: ExtensionType[] = ['safari'];

  // All types that support entry field
  const REACT_NATIVE_COMPATIBLE_TYPES: ExtensionType[] = [
    ...REACT_NATIVE_NATIVE_TYPES,
    ...REACT_NATIVE_WEB_TYPES,
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
    props.logger.warn(
      `excludedPackages specified for ${props.name} but no 'entry' field provided. ` +
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
      props.logger.log(`Inherited App Group: ${appGroup}`);
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
      props.logger.log(`Inherited deployment target: ${deploymentTarget}`);
    } else {
      deploymentTarget = typeMinimum;
      props.logger.log(
        `Using type minimum deployment target: ${deploymentTarget}`
      );
    }
  }

  // Native React Native extensions require ExpoModulesCore, which has minimum iOS 15.1
  // Web-based extensions (safari) don't require ExpoModulesCore
  const EXPO_MODULES_MINIMUM = '15.1';
  const isNativeRNExtension =
    props.entry && REACT_NATIVE_NATIVE_TYPES.includes(props.type);
  if (
    isNativeRNExtension &&
    parseFloat(deploymentTarget!) < parseFloat(EXPO_MODULES_MINIMUM)
  ) {
    props.logger.log(
      `React Native extension requires ExpoModulesCore (iOS ${EXPO_MODULES_MINIMUM}), ` +
        `raising deployment target from ${deploymentTarget} to ${EXPO_MODULES_MINIMUM}`
    );
    deploymentTarget = EXPO_MODULES_MINIMUM;
  }

  // Inherit accent color
  const colors = props.colors || {};
  const mainAppAccentColor = (config.ios as any)?.accentColor;
  if (!colors.$accent && mainAppAccentColor) {
    colors.$accent = mainAppAccentColor;
    props.logger.log(`Inherited accent color: ${mainAppAccentColor}`);
  }

  const targetProductName = Paths.sanitizeTargetName(targetName);

  // Pass resolved values to withXcodeChanges
  config = withXcodeChanges(config, {
    ...props,
    deploymentTarget,
    colors: Object.keys(colors).length > 0 ? colors : undefined,
    logger: props.logger,
  });

  // Add Podfile target only for code-based targets (skip asset-only like stickers)
  // Extensions with React Native need full RN setup, others need standalone config
  // Safari with entry uses web rendering, so it's standalone (no RN deps)
  const { TYPE_CHARACTERISTICS } = require('../target');
  const typeConfig = TYPE_CHARACTERISTICS[props.type];
  const isWebBasedEntry =
    !!props.entry && REACT_NATIVE_WEB_TYPES.includes(props.type);

  if (typeConfig.requiresCode) {
    config = withTargetPodfile(config, {
      targetName: targetProductName, // Use sanitized name to match Xcode target
      deploymentTarget: deploymentTarget!, // Guaranteed to be set by resolution logic above
      extensionType: props.type,
      excludedPackages: props.excludedPackages,
      // Standalone if no entry, or if it's a web-based entry (safari with RN Web)
      standalone: !props.entry || isWebBasedEntry,
      logger: props.logger,
    });
  } else {
    props.logger.log(
      `Skipping Podfile for asset-only target: ${targetProductName}`
    );
  }

  config = withTargetEntitlements(config, {
    targetName,
    targetDirectory: props.directory,
    type: props.type,
    entitlements: props.entitlements,
    logger: props.logger,
    buildSubdirectory: props.buildSubdirectory,
  });

  // Note: Color generation is handled in withXcodeChanges where colors are created
  // in targets/[name]/ios/build/Assets.xcassets/ (not in ios/[TargetName]/)
  // Note: Assets.xcassets is added in withXcodeChanges where we have direct access to target.uuid
  // Note: Sticker packs are also created in withXcodeChanges for proper execution order

  return config;
};
