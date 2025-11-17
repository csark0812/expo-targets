import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';

import { AndroidTargetOptions } from './withAndroidTarget';

/**
 * Generates color resources for Android
 */
export const withAndroidColors: ConfigPlugin<AndroidTargetOptions> = (
  config,
  options
) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      const { name, colors } = options;

      if (!colors || Object.keys(colors).length === 0) {
        return config;
      }

      const modulePath = path.join(platformProjectRoot, name);
      const resPath = path.join(modulePath, 'src', 'main', 'res');

      // Create res/values directory
      const valuesPath = path.join(resPath, 'values');
      fs.mkdirSync(valuesPath, { recursive: true });

      // Create res/values-night directory
      const valuesNightPath = path.join(resPath, 'values-night');
      fs.mkdirSync(valuesNightPath, { recursive: true });

      // Generate light colors
      const lightColorsPath = path.join(valuesPath, 'colors.xml');
      const lightColorsContent = generateColorsXml(colors, 'light');
      fs.writeFileSync(lightColorsPath, lightColorsContent, 'utf-8');

      // Generate dark colors
      const darkColorsPath = path.join(valuesNightPath, 'colors.xml');
      const darkColorsContent = generateColorsXml(colors, 'dark');
      fs.writeFileSync(darkColorsPath, darkColorsContent, 'utf-8');

      return config;
    },
  ]);
};

function generateColorsXml(
  colors: Record<string, { light: string; dark: string }>,
  mode: 'light' | 'dark'
): string {
  const colorEntries = Object.entries(colors)
    .map(([name, value]) => {
      const colorValue = value[mode];
      return `    <color name="${name}">${colorValue}</color>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
${colorEntries}
</resources>
`;
}

