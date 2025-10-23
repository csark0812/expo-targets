import { ConfigPlugin } from '@expo/config-plugins';
import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';

import { withIOSTarget } from './ios/withIOSTarget';
import { parseTargetConfigFromFile } from './parseTargetConfig';

export const withTargetsDir: ConfigPlugin<{
  targetsRoot?: string;
}> = (config, options) => {
  const targetsRoot = options?.targetsRoot || './targets';
  const projectRoot = config._internal!.projectRoot;

  const targetIndexFiles = globSync(`${targetsRoot}/*/index.@(ts|tsx|js|jsx)`, {
    cwd: projectRoot,
    absolute: true,
  });

  console.log(`[expo-targets] Found ${targetIndexFiles.length} target(s)`);

  targetIndexFiles.forEach((indexPath) => {
    const evaluatedConfig = parseTargetConfigFromFile(indexPath);

    const targetDirName = path.basename(path.dirname(indexPath));
    const targetDirectory = path.relative(projectRoot, path.dirname(indexPath));

    console.log(
      `[expo-targets] Processing ${targetDirName}: type=${evaluatedConfig.type}`
    );

    const hasIOS = fs.existsSync(path.join(path.dirname(indexPath), 'ios'));
    const hasAndroid = fs.existsSync(
      path.join(path.dirname(indexPath), 'android')
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
        name: evaluatedConfig.name || targetDirName,
        displayName: evaluatedConfig.displayName,
        appGroup: evaluatedConfig.appGroup,
        directory: targetDirectory,
        configPath: indexPath,
      });
    }

    if (hasAndroid && evaluatedConfig.android) {
      console.warn(
        `[expo-targets] Android support not yet implemented for ${targetDirName}`
      );
    }
  });

  return config;
};
