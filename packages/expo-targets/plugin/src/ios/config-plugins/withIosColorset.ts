import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';

import { Asset, Paths } from '../utils';

export const withIosColorset: ConfigPlugin<{
  name: string;
  color: string;
  darkColor?: string;
  targetDirectory: string;
}> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const colorsetPath = Paths.getColorsetPath({
        projectRoot: config.modRequest.projectRoot,
        targetDirectory: props.targetDirectory,
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
