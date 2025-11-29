import { ConfigPlugin } from '@expo/config-plugins';
import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';

import { withAndroidTarget } from './android/withAndroidTarget';
import { withIOSTarget } from './ios/config-plugins/withIOSTarget';
import { Logger } from './logger';

export const withTargetsDir: ConfigPlugin<{
  targetsRoot?: string;
  debug?: boolean;
}> = (config, options) => {
  const targetsRoot = options?.targetsRoot || './targets';
  const debug = options?.debug ?? false;
  const logger = new Logger(debug);
  const projectRoot = config._internal!.projectRoot;

  // Look for expo-target.config files (supports .js, .ts, or .json)
  const targetConfigFiles = globSync(
    `${targetsRoot}/*/expo-target.config.@(js|ts|json)`,
    {
      cwd: projectRoot,
      absolute: true,
    }
  );

  if (targetConfigFiles.length > 0) {
    logger.logSparse(true, `Found ${targetConfigFiles.length} target(s)`);
  }

  // Collect target configs for runtime access
  const targetConfigs: any[] = [];

  // First pass: evaluate all configs and cache them
  const evaluatedConfigs: {
    config: any;
    targetPath: string;
    targetDirName: string;
  }[] = [];

  targetConfigFiles.forEach((targetPath) => {
    let evaluatedConfig = require(targetPath);

    // Handle ES module default export (export default config)
    if (evaluatedConfig && evaluatedConfig.default) {
      evaluatedConfig = evaluatedConfig.default;
    }

    // Handle function exports (like app.config.js)
    if (typeof evaluatedConfig === 'function') {
      evaluatedConfig = evaluatedConfig(config);
    }

    const targetDirName = path.basename(path.dirname(targetPath));
    evaluatedConfigs.push({
      config: evaluatedConfig,
      targetPath,
      targetDirName,
    });
  });

  // Validate iOS-specific limitations before processing
  const iosTargetTypes: { type: string; name: string; directory: string }[] =
    [];
  evaluatedConfigs.forEach(({ config: evaluatedConfig, targetDirName }) => {
    const supportsIOS = evaluatedConfig.platforms?.includes('ios');
    if (supportsIOS && evaluatedConfig.type) {
      iosTargetTypes.push({
        type: evaluatedConfig.type,
        name: evaluatedConfig.name || targetDirName,
        directory: targetDirName,
      });
    }
  });

  const messagePayloadProviderTypes = iosTargetTypes.filter(
    (t) => t.type === 'messages' || t.type === 'stickers'
  );

  if (messagePayloadProviderTypes.length > 1) {
    const typeNames = messagePayloadProviderTypes
      .map((t) => `${t.name} (${t.type})`)
      .join(', ');
    throw new Error(
      `iOS limitation: Only one message payload provider extension is allowed per app. ` +
        `Found multiple: ${typeNames}. ` +
        `Both 'messages' and 'stickers' target types use the same extension point ` +
        `(com.apple.message-payload-provider) and cannot coexist. ` +
        `Choose either a messages app OR a stickers pack, but not both. ` +
        `See https://developer.apple.com/documentation/messages for details.`
    );
  }

  // Second pass: process targets using cached configs
  evaluatedConfigs.forEach(
    ({ config: evaluatedConfig, targetPath, targetDirName }) => {
      const targetDirectory = path.relative(
        projectRoot,
        path.dirname(targetPath)
      );

      // Validate name is specified
      if (!evaluatedConfig.name) {
        throw new Error(
          `Target in ${targetDirName} must specify 'name' property in expo-target.config`
        );
      }

      const targetName = evaluatedConfig.name;

      logger.log(
        `Processing ${targetDirName}: type=${evaluatedConfig.type}, name=${targetName}`
      );

      const supportsIOS = evaluatedConfig.platforms.includes('ios');
      const supportsAndroid = evaluatedConfig.platforms.includes('android');

      logger.log(
        `${targetDirName}: iOS=${supportsIOS}, Android=${supportsAndroid}`
      );

      // Resolve appGroup (inherit from main app if not specified)
      let appGroup = evaluatedConfig.appGroup;
      if (!appGroup) {
        const mainAppGroups =
          config.ios?.entitlements?.['com.apple.security.application-groups'];
        if (Array.isArray(mainAppGroups) && mainAppGroups.length > 0) {
          appGroup = mainAppGroups[0];
        }
      }

      if (supportsIOS && evaluatedConfig.ios) {
        config = withIOSTarget(config, {
          ...evaluatedConfig.ios,
          type: evaluatedConfig.type,
          name: targetName,
          displayName: evaluatedConfig.displayName,
          appGroup: evaluatedConfig.appGroup,
          entry: evaluatedConfig.entry,
          excludedPackages: evaluatedConfig.excludedPackages,
          directory: targetDirectory,
          configPath: targetPath,
          logger,
        });
      }

      if (supportsAndroid) {
        config = withAndroidTarget(config, {
          ...evaluatedConfig,
          directory: targetDirectory,
        });
      }

      // Store full config for runtime access (with resolved appGroup)
      targetConfigs.push({
        ...evaluatedConfig,
        appGroup,
      });
    }
  );

  // Inject target configs into expo config for runtime access
  config.extra = {
    ...config.extra,
    targets: targetConfigs,
  };

  return config;
};
