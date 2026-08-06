import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ConfigPlugin } from '@expo/config-plugins';
import { withDangerousMod } from '@expo/config-plugins';

const ASSET_NAME = 'expo_targets_config.json';

/**
 * Embeds runtime target configs into android/app/src/main/assets for
 * ExpoTargetsStorageModule.getTargetsConfig().
 */
export const withAndroidTargetsConfig: ConfigPlugin<{
  runtimeConfigs: unknown[];
}> = (config, { runtimeConfigs }) => {
  if (!runtimeConfigs.length) {
    return config;
  }

  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const assetsDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'assets'
      );
      fs.mkdirSync(assetsDir, { recursive: true });
      const outPath = path.join(assetsDir, ASSET_NAME);
      fs.writeFileSync(outPath, `${JSON.stringify(runtimeConfigs, null, 2)}\n`);
      return cfg;
    },
  ]);
};
