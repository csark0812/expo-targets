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

  // Collect target configs for runtime access
  const targetConfigs: any[] = [];

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

    const supportsIOS = evaluatedConfig.platforms.includes('ios');
    const supportsAndroid = evaluatedConfig.platforms.includes('android');

    console.log(
      `[expo-targets] ${targetDirName}: iOS=${supportsIOS}, Android=${supportsAndroid}`
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
      });
    }

    if (supportsAndroid && evaluatedConfig.android) {
      console.warn(
        `[expo-targets] Android support not yet implemented for ${targetDirName}`
      );
    }

    // Store full config for runtime access (with resolved appGroup)
    targetConfigs.push({
      ...evaluatedConfig,
      appGroup,
    });
  });

  // Inject target configs into expo config for runtime access
  config.extra = {
    ...config.extra,
    targets: targetConfigs,
  };

  return config;
};
