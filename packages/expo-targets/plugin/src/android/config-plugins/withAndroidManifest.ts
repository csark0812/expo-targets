import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest as withAndroidManifestBase,
} from '@expo/config-plugins';

import { AndroidTargetOptions } from './withAndroidTarget';

/**
 * Adds widget receiver to AndroidManifest.xml
 */
export const withAndroidManifest: ConfigPlugin<AndroidTargetOptions> = (
  config,
  options
) => {
  return withAndroidManifestBase(config, async (config) => {
    const { modResults } = config;
    const {
      type,
      packageName,
      displayName,
      updatePeriodMillis = 1800000,
      resizeMode = 'horizontal|vertical',
      widgetCategory = 'home_screen',
      permissions = [],
    } = options;

    if (type !== 'widget') {
      return config;
    }

    // Get main application element
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      modResults
    );

    // Widget receiver class name
    const receiverName = `${packageName}.${options.name}Receiver`;

    // Check if receiver already exists
    const existingReceiver = mainApplication.receiver?.find(
      (r: any) => r.$?.['android:name'] === receiverName
    );

    if (!existingReceiver) {
      // Add receiver
      if (!mainApplication.receiver) {
        mainApplication.receiver = [];
      }

      mainApplication.receiver.push({
        $: {
          'android:name': receiverName,
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': `@xml/${options.name.toLowerCase()}_info`,
            },
          },
        ],
      } as any);
    }

    // Add permissions if any
    if (permissions.length > 0) {
      if (!modResults.manifest['uses-permission']) {
        modResults.manifest['uses-permission'] = [];
      }
      permissions.forEach((permission) => {
        const existing = modResults.manifest['uses-permission']?.find(
          (p: any) => p.$?.['android:name'] === permission
        );
        if (!existing) {
          modResults.manifest['uses-permission']!.push({
            $: { 'android:name': permission },
          } as any);
        }
      });
    }

    return config;
  });
};

