import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';

import { AndroidTargetOptions } from './withAndroidTarget';

/**
 * Generates Android resources (XML files for widgets)
 */
export const withAndroidResources: ConfigPlugin<AndroidTargetOptions> = (
  config,
  options
) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      const {
        name,
        type,
        updatePeriodMillis = 1800000,
        resizeMode = 'horizontal|vertical',
        widgetCategory = 'home_screen',
        displayName,
      } = options;

      const modulePath = path.join(platformProjectRoot, name);
      const resPath = path.join(modulePath, 'src', 'main', 'res');

      if (type === 'widget') {
        // Create res/xml directory
        const xmlPath = path.join(resPath, 'xml');
        fs.mkdirSync(xmlPath, { recursive: true });

        // Generate widget info XML
        const widgetInfoPath = path.join(
          xmlPath,
          `${name.toLowerCase()}_info.xml`
        );
        const widgetInfoContent = generateWidgetInfo({
          updatePeriodMillis,
          resizeMode,
          widgetCategory,
          description: displayName || name,
        });
        fs.writeFileSync(widgetInfoPath, widgetInfoContent, 'utf-8');

        // Create res/values directory for strings
        const valuesPath = path.join(resPath, 'values');
        fs.mkdirSync(valuesPath, { recursive: true });

        // Generate strings.xml
        const stringsPath = path.join(valuesPath, 'strings.xml');
        if (!fs.existsSync(stringsPath)) {
          const stringsContent = generateStrings({
            name,
            description: displayName || name,
          });
          fs.writeFileSync(stringsPath, stringsContent, 'utf-8');
        }
      }

      return config;
    },
  ]);
};

function generateWidgetInfo(options: {
  updatePeriodMillis: number;
  resizeMode: string;
  widgetCategory: string;
  description: string;
}): string {
  const { updatePeriodMillis, resizeMode, widgetCategory, description } =
    options;

  return `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="${updatePeriodMillis}"
    android:resizeMode="${resizeMode}"
    android:widgetCategory="${widgetCategory}"
    android:description="@string/widget_description" />
`;
}

function generateStrings(options: {
  name: string;
  description: string;
}): string {
  const { description } = options;

  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="widget_description">${description}</string>
</resources>
`;
}

