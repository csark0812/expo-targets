import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';

import { Asset, Paths } from '../utils';

export const withIosColorset: ConfigPlugin<{
  name: string;
  color: string;
  darkColor?: string;
  targetName: string;
}> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const colorsetPath = Paths.getColorsetPath({
        platformProjectRoot: config.modRequest.platformProjectRoot,
        targetName: props.targetName,
        colorName: props.name,
      });

      Asset.createColorset({
        colorsetPath,
        color: props.color,
        darkColor: props.darkColor,
      });

      return config;
    },
  ]);
};
