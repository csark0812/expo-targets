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
  const exists = perms.some((p: any) => p.$?.['android:name'] === name);
  if (!exists) {
    manifest.manifest['uses-permission'] = [
      ...perms,
      { $: { 'android:name': name } },
    ];
  }
}

function buildNotificationMetaData(opts: {
  props: NotificationProps;
  packageName: string;
  channelId: string;
  channelName: string;
  category: string;
  mutationMarker: string;
}) {
  return [
    {
      $: {
        'android:name': 'expo.targets.TARGET_NAME',
        'android:value': opts.props.name,
      },
    },
    {
      $: {
        'android:name': 'expo.targets.APP_GROUP',
        'android:value': opts.props.appGroup || `group.${opts.packageName}`,
      },
    },
    {
      $: {
        'android:name': 'expo.targets.CHANNEL_ID',
        'android:value': opts.channelId,
      },
    },
    {
      $: {
        'android:name': 'expo.targets.CHANNEL_NAME',
        'android:value': opts.channelName,
      },
    },
    {
      $: {
        'android:name': 'expo.targets.NOTIF_KIND',
        'android:value':
          opts.props.type === 'notification-content' ? 'content' : 'service',
      },
    },
    {
      $: {
        'android:name': 'expo.targets.CATEGORY',
        'android:value': opts.category,
      },
    },
    {
      $: {
        'android:name': 'expo.targets.MUTATION_MARKER',
        'android:value': opts.mutationMarker,
      },
    },
  ];
}

function upsertAppMeta(
  mainApplication: any,
  props: NotificationProps,
  channelId: string
): void {
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
}

function registerNotificationService(opts: {
  mainApplication: any;
  className: string;
  metaData: ReturnType<typeof buildNotificationMetaData>;
}): void {
  const serviceConfig = {
    $: {
      'android:name': opts.className,
      'android:exported': 'false' as const,
    },
    'meta-data': opts.metaData,
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

  const existing = opts.mainApplication.service.find(
    (s: any) => s.$['android:name'] === opts.className
  );
  if (existing) {
    Object.assign(existing, serviceConfig);
  } else {
    opts.mainApplication.service.push(serviceConfig as any);
  }
}

const FCM_MESSAGING_SERVICE =
  'expo.modules.targets.notification.ExpoTargetsFcmMessagingService';

/**
 * Registers [ExpoTargetsFcmMessagingService] so data/notification FCM payloads
 * route into NotificationCompat (same markers as the local path).
 * Host must ship Firebase Messaging at runtime (expo-notifications + google-services).
 */
function registerFcmMessagingService(opts: {
  mainApplication: any;
  metaData: ReturnType<typeof buildNotificationMetaData>;
}): void {
  const serviceConfig = {
    $: {
      'android:name': FCM_MESSAGING_SERVICE,
      'android:exported': 'false' as const,
    },
    'meta-data': opts.metaData,
    'intent-filter': [
      {
        action: [
          {
            $: {
              'android:name': 'com.google.firebase.MESSAGING_EVENT',
            },
          },
        ],
      },
    ],
  };

  const existing = opts.mainApplication.service.find(
    (s: any) => s.$['android:name'] === FCM_MESSAGING_SERVICE
  );
  if (existing) {
    Object.assign(existing, serviceConfig);
  } else {
    opts.mainApplication.service.push(serviceConfig as any);
  }
}

function applyNotificationManifest(
  cfg: Parameters<Parameters<typeof withAndroidManifest>[1]>[0],
  props: NotificationProps
) {
  const packageName = cfg.android?.package;
  if (!packageName) {
    throw new Error(
      `[expo-targets] Android package required for ${props.type} target "${props.name}"`
    );
  }

  ensurePermission(cfg.modResults, 'android.permission.POST_NOTIFICATIONS');

  const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
    cfg.modResults
  );
  mainApplication.service = mainApplication.service || [];
  mainApplication['meta-data'] = mainApplication['meta-data'] || [];

  const channelId = defaultChannelId(props);
  const channelName = defaultChannelName(props);
  const iosPlist = (
    props.ios as { infoPlist?: Record<string, any> } | undefined
  )?.infoPlist;
  const category =
    props.android?.category ||
    iosPlist?.NSExtension?.NSExtensionAttributes
      ?.UNNotificationExtensionCategory ||
    'myNotificationCategory';
  const mutationMarker = props.android?.mutationMarker ?? ' [expo-targets]';
  const className = resolveServiceClassName(
    packageName,
    props,
    cfg.modRequest.projectRoot
  );
  const metaData = buildNotificationMetaData({
    props,
    packageName,
    channelId,
    channelName,
    category: String(category),
    mutationMarker,
  });

  registerNotificationService({ mainApplication, className, metaData });
  registerFcmMessagingService({ mainApplication, metaData });
  upsertAppMeta(mainApplication, props, channelId);
  return cfg;
}

/**
 * Registers notification-service / notification-content Android components.
 * Local NotificationCompat path is required. FCM receive registers
 * ExpoTargetsFcmMessagingService; operator matrix needs FCM_* + google-services.
 */
export const withAndroidNotification: ConfigPlugin<NotificationProps> = (
  config,
  props
) => {
  return withAndroidManifest(config, (cfg) =>
    applyNotificationManifest(cfg, props)
  );
};
