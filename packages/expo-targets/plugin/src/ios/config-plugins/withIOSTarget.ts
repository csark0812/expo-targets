import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import type { ConfigPlugin } from '@expo/config-plugins';
import { withDangerousMod, withInfoPlist } from '@expo/config-plugins';
import {
  type ExtensionType,
  type IOSTargetConfigWithReactNative,
  TYPE_BUNDLE_IDENTIFIER_SUFFIXES,
  TYPE_MINIMUM_DEPLOYMENT_TARGETS,
} from '../../config';
import {
  APP_GROUP_ENTITLEMENT_KEY,
  EAS_APP_GROUP_TYPES,
  EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET,
  isReactNativeCompatible,
  isReactNativeNative,
  isReactNativeWeb,
  omitEmptyApplicationGroups,
  REACT_NATIVE_COMPATIBLE_TYPES,
  requiresAppGroup,
  resolveApplicationGroups,
  resolveUiMode,
  shouldUseAppGroups,
  TYPE_CHARACTERISTICS,
} from '../../domain';
import type { Logger } from '../../logger';
import { hasTargetBlock, removeTargetBlock } from '../apply/podfile';
import { File, Paths } from '../utils/index';
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
  ui?: 'native' | 'expo-ui' | 'react-native';
  excludedPackages?: string[];
  linkerTokens?: string[];
  directory: string;
  configPath: string;
  logger: Logger;
  intents?: {
    intentsSupported?: string[];
    intentsRestrictedWhileLocked?: string[];
  };
  buildSubdirectory?: string;
}

function validateEntry(props: IosTargetProps, projectRoot: string): void {
  if (props.entry) {
    const uiMode = resolveUiMode({
      type: props.type,
      entry: props.entry,
      ui: props.ui,
    });
    const allowExpoUiWidget =
      uiMode === 'expo-ui' &&
      (props.type === 'widget' || props.type === 'watch-widget');
    if (!(isReactNativeCompatible(props.type) || allowExpoUiWidget)) {
      throw new Error(
        `Target '${props.name}' (type: ${props.type}) does not support an entry. ` +
          `'entry' can be used with: ${REACT_NATIVE_COMPATIBLE_TYPES.join(', ')}, ` +
          `or widget/watch-widget for expo-ui layouts.`
      );
    }

    const entryPath = path.resolve(projectRoot, props.entry);
    if (!fs.existsSync(entryPath)) {
      throw new Error(
        `Target '${props.name}': Entry file not found at ${props.entry}. ` +
          `Resolved path: ${entryPath}`
      );
    }
  }

  if (props.excludedPackages && !props.entry) {
    props.logger.warn(
      `excludedPackages specified for ${props.name} but no 'entry' field provided. ` +
        'excludedPackages will be ignored.'
    );
  }
}

/**
 * App Groups are inherited from the main app when the target does not name one.
 */
function validateAppGroup(props: IosTargetProps, mainAppGroups: unknown): void {
  let appGroup = props.appGroup;

  if (
    !appGroup &&
    shouldUseAppGroups(props.type) &&
    Array.isArray(mainAppGroups) &&
    mainAppGroups.length > 0
  ) {
    appGroup = mainAppGroups[0];
    props.logger.log(`Inherited App Group: ${appGroup}`);
  }

  if (requiresAppGroup(props.type) && !appGroup) {
    throw new Error(
      `Target '${props.name}' (type: ${props.type}) requires an App Group. ` +
        `Specify 'appGroup' in defineTarget() or add App Groups to main app entitlements in app.json`
    );
  }
}

/**
 * Entitlements for `generated.entitlements`. Prefer the target's `appGroup`
 * (and configured entitlements) over `config.ios.entitlements`, which Expo
 * often clears after the first prebuild once groups live only in the host
 * `.entitlements` file — otherwise re-prebuild writes an empty appex plist
 * and App Group setData/getData silently fails.
 */
function resolveTargetEntitlements(
  props: IosTargetProps,
  mainAppGroups: unknown
): Record<string, any> {
  const entitlements: Record<string, any> = {
    ...(props.entitlements || {}),
  };

  const groups = resolveApplicationGroups({
    configured: entitlements[APP_GROUP_ENTITLEMENT_KEY],
    appGroup: props.appGroup,
    mainAppGroups,
    inheritHost: shouldUseAppGroups(props.type),
  });

  if (groups && groups.length > 0) {
    entitlements[APP_GROUP_ENTITLEMENT_KEY] = groups;
  } else {
    delete entitlements[APP_GROUP_ENTITLEMENT_KEY];
  }

  return entitlements;
}

function resolveWatchDeploymentTarget(
  props: IosTargetProps,
  typeMinimum: string
): string {
  const deploymentTarget = props.deploymentTarget || typeMinimum;
  props.logger.log(`Using watchOS deployment target: ${deploymentTarget}`);
  return deploymentTarget;
}

function resolveDefaultDeploymentTarget(
  props: IosTargetProps,
  typeMinimum: string,
  mainAppTarget: string | undefined
): string {
  if (props.deploymentTarget) {
    return props.deploymentTarget;
  }
  if (
    mainAppTarget &&
    Number.parseFloat(mainAppTarget) > Number.parseFloat(typeMinimum)
  ) {
    props.logger.log(`Inherited deployment target: ${mainAppTarget}`);
    return mainAppTarget;
  }
  props.logger.log(`Using type minimum deployment target: ${typeMinimum}`);
  return typeMinimum;
}

function raiseForExpoModulesIfNeeded(
  props: IosTargetProps,
  deploymentTarget: string
): string {
  const isNativeRnExtension = props.entry && isReactNativeNative(props.type);
  if (
    !isNativeRnExtension ||
    Number.parseFloat(deploymentTarget) >=
      Number.parseFloat(EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET)
  ) {
    return deploymentTarget;
  }
  props.logger.log(
    `React Native extension requires ExpoModulesCore (iOS ${EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET}), ` +
      `raising deployment target from ${deploymentTarget} to ${EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET}`
  );
  return EXPO_MODULES_MINIMUM_DEPLOYMENT_TARGET;
}

function resolveDeploymentTarget(
  props: IosTargetProps,
  mainAppTarget: string | undefined
): string {
  const typeMinimum =
    TYPE_MINIMUM_DEPLOYMENT_TARGETS[
      props.type as keyof typeof TYPE_MINIMUM_DEPLOYMENT_TARGETS
    ];

  if (props.type === 'watch' || props.type === 'watch-widget') {
    return resolveWatchDeploymentTarget(props, typeMinimum);
  }

  const deploymentTarget = resolveDefaultDeploymentTarget(
    props,
    typeMinimum,
    mainAppTarget
  );
  return raiseForExpoModulesIfNeeded(props, deploymentTarget);
}

function resolveColors(
  props: IosTargetProps,
  mainAppAccentColor: string | undefined
): NonNullable<IosTargetProps['colors']> {
  const colors = props.colors || {};

  if (!colors.$accent && mainAppAccentColor) {
    colors.$accent = mainAppAccentColor;
    props.logger.log(`Inherited accent color: ${mainAppAccentColor}`);
  }

  return colors;
}

/**
 * Add a Podfile target only for code-based targets (skip asset-only like
 * stickers). Extensions with React Native need full RN setup, others need
 * standalone config — Safari with an entry renders on the web, so it is
 * standalone too.
 */
const withTargetPods: ConfigPlugin<{
  props: IosTargetProps;
  targetProductName: string;
  deploymentTarget: string;
}> = (config, { props, targetProductName, deploymentTarget }) => {
  if (!TYPE_CHARACTERISTICS[props.type].requiresCode) {
    props.logger.log(
      `Skipping Podfile for asset-only target: ${targetProductName}`
    );
    return config;
  }

  // watchOS companions / widgets are native SwiftUI only — CocoaPods/RN cannot target watchos here.
  if (props.type === 'watch' || props.type === 'watch-widget') {
    props.logger.log(
      `Skipping Podfile for watchOS target: ${targetProductName}`
    );
    return withDangerousMod(config, [
      'ios',
      async (cfg) => {
        const { platformProjectRoot } = cfg.modRequest;
        const podfilePath = path.join(platformProjectRoot, 'Podfile');
        const podfile = File.readFileIfExists(podfilePath);
        if (podfile && hasTargetBlock(podfile, targetProductName)) {
          props.logger.log(
            `Removing leftover Podfile target for watchOS: ${targetProductName}`
          );
          File.writeFileSafe(
            podfilePath,
            removeTargetBlock(podfile, targetProductName)
          );
        }
        return cfg;
      },
    ]);
  }

  const isWebBasedEntry = Boolean(props.entry) && isReactNativeWeb(props.type);
  const uiMode = resolveUiMode({
    type: props.type,
    entry: props.entry,
    ui: props.ui,
  });
  // watch-widget returns earlier (no Podfile). Remaining expo-ui widget targets
  // stay sibling/standalone (not nested RN share-class).
  const isExpoUiWidget = uiMode === 'expo-ui' && props.type === 'widget';

  return withTargetPodfile(config, {
    targetName: targetProductName, // Use sanitized name to match Xcode target
    deploymentTarget,
    extensionType: props.type,
    excludedPackages: props.excludedPackages,
    linkerTokens: props.linkerTokens,
    standalone: !props.entry || isWebBasedEntry || isExpoUiWidget,
    expoUiWidget: isExpoUiWidget,
    targetDirectory: props.directory, // For pods.rb file detection
    logger: props.logger,
  });
};

/**
 * App Clips are provisioned against their parent app and can claim the parent's
 * associated domains, rewritten from `applinks:` to `appclips:`.
 */
function clipEntitlements(
  mainBundleId: string,
  associatedDomains: unknown
): Record<string, any> {
  const entitlements: Record<string, any> = {
    'com.apple.developer.parent-application-identifiers': [
      `$(AppIdentifierPrefix)${mainBundleId}`,
    ],
    'com.apple.developer.on-demand-install-capable': true,
  };

  if (!Array.isArray(associatedDomains) || associatedDomains.length === 0) {
    return entitlements;
  }

  const clipDomains = associatedDomains
    .map((domain: string) => {
      const match = domain.match(/^applinks:(.+)$/);
      return match ? `appclips:${match[1]}` : null;
    })
    .filter(Boolean);

  if (clipDomains.length > 0) {
    entitlements['com.apple.developer.associated-domains'] = clipDomains;
  }

  return entitlements;
}

/**
 * Entitlements handed to EAS Build. These mirror what withTargetEntitlements
 * writes, minus restricted capabilities EAS cannot auto-provision — notably
 * wallet's com.apple.developer.payment-pass-provisioning, which needs manual
 * Apple approval and must be configured in the Apple Developer Portal.
 */
function buildEasEntitlements({
  props,
  mainBundleId,
  mainAppEntitlements,
}: {
  props: IosTargetProps;
  mainBundleId: string;
  mainAppEntitlements: Record<string, any> | undefined;
}): Record<string, any> {
  const easEntitlements: Record<string, any> = {
    ...(props.entitlements || {}),
  };

  const mainAppGroups = mainAppEntitlements?.[APP_GROUP_ENTITLEMENT_KEY];
  const groups = resolveApplicationGroups({
    configured: easEntitlements[APP_GROUP_ENTITLEMENT_KEY],
    appGroup: props.appGroup,
    mainAppGroups,
    inheritHost:
      shouldUseAppGroups(props.type) &&
      EAS_APP_GROUP_TYPES.includes(props.type),
  });

  if (groups && groups.length > 0) {
    easEntitlements[APP_GROUP_ENTITLEMENT_KEY] = groups;
  } else {
    delete easEntitlements[APP_GROUP_ENTITLEMENT_KEY];
  }

  if (props.type === 'clip') {
    Object.assign(
      easEntitlements,
      clipEntitlements(
        mainBundleId,
        mainAppEntitlements?.['com.apple.developer.associated-domains']
      )
    );
  }

  return omitEmptyApplicationGroups(easEntitlements);
}

/**
 * Configure EAS Build credentials so it creates the App ID and provisioning
 * profile for this extension target automatically.
 */
const withTargetEASCredentials: ConfigPlugin<{
  props: IosTargetProps;
  targetProductName: string;
}> = (config, { props, targetProductName }) => {
  const mainBundleId = config.ios?.bundleIdentifier;
  if (!mainBundleId) {
    return config;
  }

  // Calculate bundle identifier (same logic as withXcodeChanges)
  const bundleIdentifierSuffix =
    TYPE_BUNDLE_IDENTIFIER_SUFFIXES[props.type] ||
    Paths.sanitizeTargetName(props.name);
  const bundleIdentifier =
    props.bundleIdentifier || `${mainBundleId}.${bundleIdentifierSuffix}`;

  const easEntitlements = buildEasEntitlements({
    props,
    mainBundleId,
    mainAppEntitlements: config.ios?.entitlements,
  });

  return withEASCredentials(config, {
    targetName: targetProductName,
    bundleIdentifier,
    entitlements:
      Object.keys(easEntitlements).length > 0 ? easEntitlements : undefined,
    logger: props.logger,
  });
};

/**
 * Bake ExpoWidgetsAppGroupIdentifier into the widget appex + host Info.plist
 * so WidgetsStorage / TimelineProvider share the same App Group suite.
 */
function withExpoWidgetsAppGroupKeys(
  config: Parameters<typeof withInfoPlist>[0],
  props: IosTargetProps
) {
  const uiMode = resolveUiMode({
    type: props.type,
    entry: props.entry,
    ui: props.ui,
  });
  if (
    uiMode !== 'expo-ui' ||
    !(props.type === 'widget' || props.type === 'watch-widget') ||
    !props.appGroup
  ) {
    return config;
  }

  props.infoPlist = {
    ...(props.infoPlist || {}),
    ExpoWidgetsAppGroupIdentifier: props.appGroup,
  };

  return withInfoPlist(config, (cfg) => {
    cfg.modResults.ExpoWidgetsAppGroupIdentifier = props.appGroup!;
    return cfg;
  });
}

export const withIOSTarget: ConfigPlugin<IosTargetProps> = (config, props) => {
  const targetName = props.displayName || props.name;
  props.logger.log(`Configuring iOS target: ${targetName} (${props.type})`);

  validateEntry(props, config._internal?.projectRoot || process.cwd());
  validateAppGroup(
    props,
    config.ios?.entitlements?.[APP_GROUP_ENTITLEMENT_KEY]
  );

  const deploymentTarget = resolveDeploymentTarget(
    props,
    (config.ios as any)?.deploymentTarget
  );
  const colors = resolveColors(props, (config.ios as any)?.accentColor);
  const targetProductName = Paths.sanitizeTargetName(targetName);

  let next = withExpoWidgetsAppGroupKeys(config, props);

  // Pass resolved values to withXcodeChanges
  next = withXcodeChanges(next, {
    ...props,
    deploymentTarget,
    colors: Object.keys(colors).length > 0 ? colors : undefined,
    logger: props.logger,
  });

  next = withTargetPods(next, { props, targetProductName, deploymentTarget });

  next = withTargetEntitlements(next, {
    targetName,
    targetDirectory: props.directory,
    type: props.type,
    entitlements: resolveTargetEntitlements(
      props,
      config.ios?.entitlements?.[APP_GROUP_ENTITLEMENT_KEY]
    ),
    logger: props.logger,
    buildSubdirectory: props.buildSubdirectory,
  });

  // Note: Color generation is handled in withXcodeChanges where colors are created
  // in ios/<App>/ExpoTargetsGenerated/<Product>/Assets.xcassets/
  // Note: Assets.xcassets is added in withXcodeChanges where we have direct access to target.uuid
  // Note: Sticker packs are also created in withXcodeChanges for proper execution order

  return withTargetEASCredentials(next, { props, targetProductName });
};
