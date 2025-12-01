import { ConfigPlugin } from '@expo/config-plugins';

import type { ExtensionType } from '../../config';
import { Logger } from '../../logger';

interface EASCredentialsProps {
  targetName: string;
  bundleIdentifier: string;
  entitlements?: Record<string, any>;
  logger: Logger;
}

/**
 * Safely sets a nested property on an object, creating intermediate objects if needed.
 */
function safeSet(obj: any, key: string, value: any): void {
  const segments = key.split('.');
  const last = segments.pop();
  segments.forEach((segment) => {
    if (!obj[segment]) {
      obj[segment] = {};
    }
    obj = obj[segment];
  });
  if (last && !obj[last]) {
    obj[last] = value;
  }
}

/**
 * Configures EAS Build to automatically create App IDs and provisioning profiles
 * for extension targets.
 *
 * This adds the extension to `extra.eas.build.experimental.ios.appExtensions`
 * which tells EAS CLI to:
 * 1. Create App IDs for each extension in Apple Developer Portal
 * 2. Generate provisioning profiles for each extension
 * 3. Configure code signing during the build
 *
 * @see https://docs.expo.dev/build-reference/app-extensions/
 */
export const withEASCredentials: ConfigPlugin<EASCredentialsProps> = (
  config,
  { targetName, bundleIdentifier, entitlements, logger }
) => {
  // Initialize the appExtensions array if it doesn't exist
  safeSet(config, 'extra.eas.build.experimental.ios.appExtensions', []);

  const appExtensions = config.extra!.eas.build.experimental.ios
    .appExtensions as {
    targetName: string;
    bundleIdentifier: string;
    entitlements?: Record<string, any>;
  }[];

  // Check if this extension already exists
  const existingIndex = appExtensions.findIndex(
    (ext) => ext.bundleIdentifier === bundleIdentifier
  );

  const extensionConfig = {
    targetName,
    bundleIdentifier,
    ...(entitlements && Object.keys(entitlements).length > 0
      ? { entitlements }
      : {}),
  };

  if (existingIndex > -1) {
    logger.log(`Updating EAS credentials for ${targetName}`);
    appExtensions[existingIndex] = extensionConfig;
  } else {
    logger.log(`Adding EAS credentials for ${targetName}`);
    appExtensions.push(extensionConfig);
  }

  return config;
};

export default withEASCredentials;
