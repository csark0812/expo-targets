import { ConfigPlugin } from '@expo/config-plugins';
import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';

import { withIOSTarget } from './ios/config-plugins/withIOSTarget';

export const withTargetsDir: ConfigPlugin<{
  targetsRoot?: string;
}> = (config, options) => {
  const targetsRoot = options?.targetsRoot || './targets';
  const projectRoot = config._internal!.projectRoot;

  // Look for expo-target.config files (supports .js, .ts, or .json)
  const targetConfigFiles = globSync(
    `${targetsRoot}/*/expo-target.config.@(js|ts|json)`,
    {
      cwd: projectRoot,
      absolute: true,
    }
  );

  console.log(`[expo-targets] Found ${targetConfigFiles.length} target(s)`);

  // Collect target metadata for runtime access
  const targetMetadata: Record<string, { appGroup?: string }> = {};

  targetConfigFiles.forEach((targetPath) => {
    let evaluatedConfig = require(targetPath);

    // Handle ES module default export (export default config)
    if (evaluatedConfig && evaluatedConfig.default) {
      evaluatedConfig = evaluatedConfig.default;
    }

    const targetDirName = path.basename(path.dirname(targetPath));
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

    console.log(
      `[expo-targets] Processing ${targetDirName}: type=${evaluatedConfig.type}, name=${targetName}`
    );

    // Store metadata for runtime access
    targetMetadata[targetName] = {
      appGroup: evaluatedConfig.appGroup,
    };

    const hasIOS = fs.existsSync(path.join(path.dirname(targetPath), 'ios'));
    const hasAndroid = fs.existsSync(
      path.join(path.dirname(targetPath), 'android')
    );

    console.log(
      `[expo-targets] ${targetDirName}: iOS=${hasIOS}, Android=${hasAndroid}`
    );

    // Validate platforms array matches actual directories
    if (hasIOS && !evaluatedConfig.platforms.includes('ios')) {
      console.warn(
        `[expo-targets] iOS directory exists but 'ios' not in platforms array for ${targetDirName}`
      );
    }
    if (hasAndroid && !evaluatedConfig.platforms.includes('android')) {
      console.warn(
        `[expo-targets] Android directory exists but 'android' not in platforms array for ${targetDirName}`
      );
    }

    if (hasIOS && evaluatedConfig.ios) {
      config = withIOSTarget(config, {
        ...evaluatedConfig.ios,
        type: evaluatedConfig.type,
        name: targetName,
        displayName: evaluatedConfig.displayName,
        appGroup: evaluatedConfig.appGroup,
        directory: targetDirectory,
        configPath: targetPath,
      });
    }

    if (hasAndroid && evaluatedConfig.android) {
      console.warn(
        `[expo-targets] Android support not yet implemented for ${targetDirName}`
      );
    }
  });

  // Inject target metadata into expo config for runtime access
  config.extra = {
    ...config.extra,
    expoTargets: targetMetadata,
  };

  return config;
};
