import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import type { ConfigPlugin } from '@expo/config-plugins';
import {
  type ExtensionType,
  type IOSTargetConfigWithReactNative,
  TYPE_BUNDLE_IDENTIFIER_SUFFIXES,
  TYPE_MINIMUM_DEPLOYMENT_TARGETS,
} from '../../config';
import {
  EAS_APP_GROUP_TYPES,
  EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET,
  isReactNativeCompatible,
  isReactNativeNative,
  isReactNativeWeb,
  REACT_NATIVE_COMPATIBLE_TYPES,
  requiresAppGroup,
  TYPE_CHARACTERISTICS,
} from '../../domain';
import type { Logger } from '../../logger';
import { Paths } from '../utils/index';
import { withEASCredentials } from './withEASCredentials';
import { withTargetEntitlements } from './withEntitlements';
import { withTargetPodfile } from './withPodfile';
import { withXcodeChanges } from './withXcodeChanges';

interface IosTargetProps extends IOSTargetConfigWithReactNative {
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity; tracked for refactor
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing complexity; tracked for refactor
export const withIOSTarget: ConfigPlugin<IosTargetProps> = (config, props) => {
  const targetName = props.displayName || props.name;
  props.logger.log(`Configuring iOS target: ${targetName} (${props.type})`);

  // Validate entry field
  if (props.entry) {
    if (!isReactNativeCompatible(props.type)) {
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
        'excludedPackages will be ignored.'
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
  if (requiresAppGroup(props.type) && !appGroup) {
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
    if (
      mainAppTarget &&
      Number.parseFloat(mainAppTarget) > Number.parseFloat(typeMinimum)
    ) {
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
  const isNativeRnExtension = props.entry && isReactNativeNative(props.type);
  if (
    isNativeRnExtension &&
    Number.parseFloat(deploymentTarget!) <
      Number.parseFloat(EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET)
  ) {
    props.logger.log(
      `React Native extension requires ExpoModulesCore (iOS ${EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET}), ` +
        `raising deployment target from ${deploymentTarget} to ${EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET}`
    );
    deploymentTarget = EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET;
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
  const typeConfig = TYPE_CHARACTERISTICS[props.type];
  const isWebBasedEntry = Boolean(props.entry) && isReactNativeWeb(props.type);

  if (typeConfig.requiresCode) {
    config = withTargetPodfile(config, {
      targetName: targetProductName, // Use sanitized name to match Xcode target
      deploymentTarget: deploymentTarget!, // Guaranteed to be set by resolution logic above
      extensionType: props.type,
      excludedPackages: props.excludedPackages,
      // Standalone if no entry, or if it's a web-based entry (safari with RN Web)
      standalone: !props.entry || isWebBasedEntry,
      targetDirectory: props.directory, // For pods.rb file detection
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

  // Configure EAS Build credentials for automatic App ID and provisioning profile creation
  // This tells EAS CLI about this extension target so it can manage credentials automatically
  const mainBundleId = config.ios?.bundleIdentifier;
  if (mainBundleId) {
    // Calculate bundle identifier (same logic as withXcodeChanges)
    const bundleIdentifierSuffix =
      TYPE_BUNDLE_IDENTIFIER_SUFFIXES[props.type] ||
      Paths.sanitizeTargetName(props.name);
    const bundleIdentifier =
      props.bundleIdentifier || `${mainBundleId}.${bundleIdentifierSuffix}`;

    // Build entitlements for EAS credentials
    // These should match what withTargetEntitlements generates
    const easEntitlements: Record<string, any> = {
      ...(props.entitlements || {}),
    };

    // Add App Groups if applicable (matching withTargetEntitlements logic)
    const mainAppGroups =
      config.ios?.entitlements?.['com.apple.security.application-groups'];
    if (Array.isArray(mainAppGroups) && mainAppGroups.length > 0) {
      if (EAS_APP_GROUP_TYPES.includes(props.type)) {
        easEntitlements['com.apple.security.application-groups'] =
          mainAppGroups;
      }
    }

    // Add App Clip specific entitlements
    if (props.type === 'clip') {
      easEntitlements['com.apple.developer.parent-application-identifiers'] = [
        `$(AppIdentifierPrefix)${mainBundleId}`,
      ];
      easEntitlements['com.apple.developer.on-demand-install-capable'] = true;

      // Copy associated domains if present
      const associatedDomains =
        config.ios?.entitlements?.['com.apple.developer.associated-domains'];
      if (Array.isArray(associatedDomains) && associatedDomains.length > 0) {
        // Transform applinks: to appclips: for App Clips
        const clipDomains = associatedDomains
          .map((domain: string) => {
            const match = domain.match(/^applinks:(.+)$/);
            return match ? `appclips:${match[1]}` : null;
          })
          .filter(Boolean);
        if (clipDomains.length > 0) {
          easEntitlements['com.apple.developer.associated-domains'] =
            clipDomains;
        }
      }
    }

    // Note: Wallet extension entitlements (com.apple.developer.payment-pass-provisioning)
    // are NOT added to EAS credentials because this is a restricted capability that
    // requires manual Apple approval. The entitlement is still added to the actual
    // .entitlements file via withTargetEntitlements, but EAS cannot auto-provision
    // profiles with this capability. Users must manually configure this in Apple Developer Portal.

    config = withEASCredentials(config, {
      targetName: targetProductName,
      bundleIdentifier,
      entitlements:
        Object.keys(easEntitlements).length > 0 ? easEntitlements : undefined,
      logger: props.logger,
    });
  }

  return config;
};
