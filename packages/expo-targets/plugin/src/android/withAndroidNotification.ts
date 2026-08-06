import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AndroidConfig,
  type ConfigPlugin,
  withAndroidManifest,
} from '@expo/config-plugins';
import type { TargetConfig } from '../config';
import { sanitizeTargetSegment, toPascalName } from './activationMime';

type NotificationProps = TargetConfig & { directory: string };

function defaultChannelId(props: NotificationProps): string {
  return (
    props.android?.channelId ||
    `expo_targets_${sanitizeTargetSegment(props.name)}`
  );
}

function defaultChannelName(props: NotificationProps): string {
  return props.android?.channelName || props.displayName || props.name;
}

function resolveServiceClassName(
  packageName: string,
  props: NotificationProps,
  projectRoot: string
): string {
  const segment = sanitizeTargetSegment(props.name);
  const pascal = toPascalName(props.name);
  const userClass = `${packageName}.target.${segment}.${pascal}NotificationService`;
  const userPath = path.join(
    projectRoot,
    props.directory,
    'android',
    ...packageName.split('.'),
    'target',
    segment,
    `${pascal}NotificationService.kt`
  );
  if (fs.existsSync(userPath)) {
    return userClass;
  }
  return 'expo.modules.targets.notification.ExpoTargetsNotificationService';
}

function ensurePermission(manifest: any, name: string): void {
  const perms = manifest.manifest['uses-permission'] || [];
  const exists = perms.some(
    (p: any) => p.$?.['android:name'] === name
  );
  if (!exists) {
    manifest.manifest['uses-permission'] = [
      ...perms,
      { $: { 'android:name': name } },
    ];
  }
}

/**
 * Registers notification-service / notification-content Android components.
 * Local NotificationCompat path is required; FCM push is leftover (no creds).
 */
export const withAndroidNotification: ConfigPlugin<NotificationProps> = (
  config,
  props
) => {
  return withAndroidManifest(config, (cfg) => {
    const packageName = cfg.android?.package;
    if (!packageName) {
      throw new Error(
        `[expo-targets] Android package required for ${props.type} target "${props.name}"`
      );
    }

    ensurePermission(
      cfg.modResults,
      'android.permission.POST_NOTIFICATIONS'
    );

    const mainApplication =
      AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    mainApplication.service = mainApplication.service || [];
    mainApplication['meta-data'] = mainApplication['meta-data'] || [];

    const channelId = defaultChannelId(props);
    const channelName = defaultChannelName(props);
    const iosPlist = (props.ios as { infoPlist?: Record<string, any> } | undefined)
      ?.infoPlist;
    const category =
      props.android?.category ||
      iosPlist?.NSExtension?.NSExtensionAttributes
        ?.UNNotificationExtensionCategory ||
      'myNotificationCategory';
    const mutationMarker =
      props.android?.mutationMarker ?? ' [expo-targets]';

    const className = resolveServiceClassName(
      packageName,
      props,
      cfg.modRequest.projectRoot
    );

    const metaData = [
      {
        $: {
          'android:name': 'expo.targets.TARGET_NAME',
          'android:value': props.name,
        },
      },
      {
        $: {
          'android:name': 'expo.targets.APP_GROUP',
          'android:value': props.appGroup || `group.${packageName}`,
        },
      },
      {
        $: {
          'android:name': 'expo.targets.CHANNEL_ID',
          'android:value': channelId,
        },
      },
      {
        $: {
          'android:name': 'expo.targets.CHANNEL_NAME',
          'android:value': channelName,
        },
      },
      {
        $: {
          'android:name': 'expo.targets.NOTIF_KIND',
          'android:value':
            props.type === 'notification-content' ? 'content' : 'service',
        },
      },
      {
        $: {
          'android:name': 'expo.targets.CATEGORY',
          'android:value': String(category),
        },
      },
      {
        $: {
          'android:name': 'expo.targets.MUTATION_MARKER',
          'android:value': mutationMarker,
        },
      },
    ];

    const serviceConfig = {
      $: {
        'android:name': className,
        'android:exported': 'false' as const,
      },
      'meta-data': metaData,
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'expo.targets.action.PROCESS_NOTIFICATION',
              },
            },
          ],
        },
      ],
    };

    const existing = mainApplication.service.find(
      (s: any) => s.$['android:name'] === className
    );
    if (existing) {
      Object.assign(existing, serviceConfig);
    } else {
      mainApplication.service.push(serviceConfig as any);
    }

    // Application-level channel defaults for LiveActivity helper + host routing.
    const appMetaKeys = [
      {
        name: `expo.targets.notif.${props.name}.CHANNEL_ID`,
        value: channelId,
      },
      {
        name: `expo.targets.notif.${props.name}.KIND`,
        value: props.type === 'notification-content' ? 'content' : 'service',
      },
    ];
    for (const { name, value } of appMetaKeys) {
      const hit = mainApplication['meta-data'].find(
        (m: any) => m.$?.['android:name'] === name
      );
      if (hit) {
        hit.$['android:value'] = value;
      } else {
        mainApplication['meta-data'].push({
          $: { 'android:name': name, 'android:value': value },
        });
      }
    }

    return cfg;
  });
};
