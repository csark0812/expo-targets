import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import path from 'path';

import { Podfile, File } from '../utils';

export const withTargetPodfile: ConfigPlugin<{
  targetName: string;
  deploymentTarget: string;
  excludedPackages?: string[];
}> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      let podfile = File.readFileIfExists(podfilePath);

      if (!podfile) {
        throw new Error(`Podfile not found at ${podfilePath}`);
      }

      // Check if target already exists
      if (Podfile.hasTargetBlock(podfile, props.targetName)) {
        console.log(
          `[expo-targets] Podfile target '${props.targetName}' already exists, skipping`
        );
        return config;
      }

      // Generate React Native target block
      const targetBlock = Podfile.generateReactNativeTargetBlock({
        targetName: props.targetName,
        deploymentTarget: props.deploymentTarget,
      });

      // Insert target block into Podfile
      podfile = Podfile.insertTargetBlock(podfile, targetBlock);

      File.writeFileSafe(podfilePath, podfile);
      return config;
    },
  ]);
};
