import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import normalizeColor from '@react-native/normalize-colors';
import fs from 'fs';
import path from 'path';

export const withIosColorset: ConfigPlugin<{
  name: string;
  color: string;
  darkColor?: string;
  targetDirectory: string;
}> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const colorsetPath = path.join(
        config.modRequest.projectRoot,
        props.targetDirectory,
        'ios',
        'Assets.xcassets',
        `${props.name}.colorset`
      );

      fs.mkdirSync(colorsetPath, { recursive: true });

      const colors: any[] = [
        {
          color: {
            'color-space': 'srgb',
            components: normalizeColorToComponents(props.color),
          },
          idiom: 'universal',
        },
      ];

      if (props.darkColor) {
        colors.push({
          appearances: [{ appearance: 'luminosity', value: 'dark' }],
          color: {
            'color-space': 'srgb',
            components: normalizeColorToComponents(props.darkColor),
          },
          idiom: 'universal',
        });
      }

      const contentsJson = {
        colors,
        info: { author: 'xcode', version: 1 },
      };

      fs.writeFileSync(
        path.join(colorsetPath, 'Contents.json'),
        JSON.stringify(contentsJson, null, 2)
      );

      return config;
    },
  ]);
};

function normalizeColorToComponents(color: string) {
  const normalized = normalizeColor(color);
  if (normalized === null || normalized === undefined) {
    throw new Error(`Invalid color: ${color}`);
  }
  const r = ((normalized >> 16) & 0xff) / 255;
  const g = ((normalized >> 8) & 0xff) / 255;
  const b = (normalized & 0xff) / 255;
  const a = ((normalized >> 24) & 0xff) / 255;
  return {
    red: r.toFixed(3),
    green: g.toFixed(3),
    blue: b.toFixed(3),
    alpha: a.toFixed(3),
  };
}
