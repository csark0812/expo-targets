import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';

import { AndroidTargetOptions } from './withAndroidTarget';

/**
 * Copies Android source files from targets directory to android module
 */
export const withAndroidModule: ConfigPlugin<AndroidTargetOptions> = (
  config,
  options
) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { platformProjectRoot, projectRoot } = config.modRequest;
      const { name, packageName, directory } = options;

      const modulePath = path.join(platformProjectRoot, name);
      const srcPath = path.join(
        modulePath,
        'src',
        'main',
        'kotlin',
        ...packageName.split('.')
      );

      // Ensure source directory exists
      fs.mkdirSync(srcPath, { recursive: true });

      // Source directory in targets
      const targetAndroidDir = path.join(projectRoot, directory, 'android');

      // Copy Kotlin files if they exist
      if (fs.existsSync(targetAndroidDir)) {
        const files = fs.readdirSync(targetAndroidDir);
        files.forEach((file) => {
          if (file.endsWith('.kt')) {
            const sourcePath = path.join(targetAndroidDir, file);
            const destPath = path.join(srcPath, file);
            fs.copyFileSync(sourcePath, destPath);
          }
        });
      }

      return config;
    },
  ]);
};

