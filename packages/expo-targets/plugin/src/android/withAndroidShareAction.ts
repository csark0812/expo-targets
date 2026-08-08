import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AndroidConfig,
  type ConfigPlugin,
  withAndroidManifest,
} from '@expo/config-plugins';
import type { ShareExtensionActivationRule, TargetConfig } from '../config';
import {
  mimePlanFromActivationRules,
  sanitizeTargetSegment,
  toPascalName,
} from './activationMime';

type ShareActionProps = TargetConfig & { directory: string };

function resolveActivationRules(
  props: ShareActionProps
): ShareExtensionActivationRule[] | undefined {
  // Android CNG: prefer android.activationRules so host Share.share (SEND)
  // is not dropped when ios rules differ. Fall back to ios for dual configs.
  const androidRules = props.android?.activationRules;
  if (androidRules?.length) return androidRules;
  return props.ios?.activationRules;
}

function resolveActivityClassName(
  packageName: string,
  props: ShareActionProps,
  projectRoot: string
): string {
  const segment = sanitizeTargetSegment(props.name);
  const pascal = toPascalName(props.name);
  const kind = props.type === 'action' ? 'Action' : 'Share';
  const userClass = `${packageName}.target.${segment}.${pascal}${kind}Activity`;

  const userPath = path.join(
    projectRoot,
    props.directory,
    'android',
    ...packageName.split('.'),
    'target',
    segment,
    `${pascal}${kind}Activity.kt`
  );

  if (fs.existsSync(userPath)) {
    return userClass;
  }

  return defaultLibraryActivityClass(props);
}

function defaultLibraryActivityClass(props: ShareActionProps): string {
  const useRn = 'entry' in props && Boolean(props.entry);
  if (props.type === 'action') {
    return useRn
      ? 'expo.modules.targets.extension.ExpoTargetsReactActionActivity'
      : 'expo.modules.targets.extension.ExpoTargetsActionActivity';
  }
  return useRn
    ? 'expo.modules.targets.extension.ExpoTargetsReactShareActivity'
    : 'expo.modules.targets.extension.ExpoTargetsShareActivity';
}

function buildIntentFilters(
  type: 'share' | 'action',
  rules: ShareExtensionActivationRule[] | undefined
): any[] {
  if (type === 'action') {
    // PROCESS_TEXT = selection toolbar; SEND = host Share.share / DW openShareText
    // Locked P (host sheet → chooser → Activity). MIME from activationRules.
    const filters: any[] = [
      {
        action: [
          { $: { 'android:name': 'android.intent.action.PROCESS_TEXT' } },
        ],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        ],
        data: [{ $: { 'android:mimeType': 'text/plain' } }],
      },
    ];
    const plan = mimePlanFromActivationRules(rules);
    if (plan.singleMimes.length) {
      filters.push({
        action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        ],
        data: plan.singleMimes.map((mime) => ({
          $: { 'android:mimeType': mime },
        })),
      });
    }
    return filters;
  }

  const plan = mimePlanFromActivationRules(rules);
  const filters: any[] = [];

  if (plan.singleMimes.length) {
    filters.push({
      action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
      category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
      data: plan.singleMimes.map((mime) => ({
        $: { 'android:mimeType': mime },
      })),
    });
  }

  if (plan.multipleMimes.length) {
    filters.push({
      action: [
        { $: { 'android:name': 'android.intent.action.SEND_MULTIPLE' } },
      ],
      category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
      data: plan.multipleMimes.map((mime) => ({
        $: { 'android:mimeType': mime },
      })),
    });
  }

  return filters;
}

function buildShareActionMetaData(
  props: ShareActionProps,
  packageName: string
) {
  return [
    {
      $: {
        'android:name': 'expo.targets.TARGET_NAME',
        'android:value': props.name,
      },
    },
    {
      $: {
        'android:name': 'expo.targets.MODULE_NAME',
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
        'android:name': 'expo.targets.USE_RN',
        'android:value': 'entry' in props && props.entry ? 'true' : 'false',
      },
    },
  ];
}

function registerShareActionActivity(opts: {
  mainApplication: any;
  className: string;
  label: string;
  intentFilters: any[];
  metaData: ReturnType<typeof buildShareActionMetaData>;
}): void {
  const activityConfig = {
    $: {
      'android:name': opts.className,
      'android:exported': 'true' as const,
      'android:label': opts.label,
      'android:theme': '@style/Theme.AppCompat.Light.Dialog',
      'android:excludeFromRecents': 'true',
    },
    'intent-filter': opts.intentFilters,
    'meta-data': opts.metaData,
  };

  const existing = opts.mainApplication.activity.find(
    (a: any) => a.$['android:name'] === opts.className
  );
  if (existing) {
    Object.assign(existing, activityConfig);
  } else {
    opts.mainApplication.activity.push(activityConfig as any);
  }
}

/**
 * Registers a dedicated Share or Action Activity (not MainActivity).
 */
export const withAndroidShareAction: ConfigPlugin<ShareActionProps> = (
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

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults
    );
    mainApplication.activity = mainApplication.activity || [];

    const className = resolveActivityClassName(
      packageName,
      props,
      cfg.modRequest.projectRoot
    );
    const label = props.displayName || props.name;
    const rules = resolveActivationRules(props);
    const intentFilters = buildIntentFilters(
      props.type === 'action' ? 'action' : 'share',
      rules
    );
    const metaData = buildShareActionMetaData(props, packageName);

    registerShareActionActivity({
      mainApplication,
      className,
      label,
      intentFilters,
      metaData,
    });

    return cfg;
  });
};
