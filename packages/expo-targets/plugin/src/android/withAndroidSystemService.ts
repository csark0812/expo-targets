import {
  AndroidConfig,
  type ConfigPlugin,
  withAndroidManifest,
} from '@expo/config-plugins';
import type { TargetConfig } from '../config';
import { sanitizeTargetSegment } from './activationMime';
import {
  deepenClassBaseName,
  resolveUserOrLibraryClass,
} from './resolveUserClass';

type SystemProps = TargetConfig & { directory: string };

function ensurePermission(manifest: any, name: string): void {
  const perms = manifest.manifest['uses-permission'] || [];
  if (perms.some((p: any) => p.$?.['android:name'] === name)) return;
  manifest.manifest['uses-permission'] = [
    ...perms,
    { $: { 'android:name': name } },
  ];
}

function upsertService(
  mainApplication: any,
  serviceConfig: Record<string, unknown>
): void {
  mainApplication.service = mainApplication.service || [];
  const name = (serviceConfig.$ as any)['android:name'];
  const existing = mainApplication.service.find(
    (s: any) => s.$['android:name'] === name
  );
  if (existing) {
    Object.assign(existing, serviceConfig);
  } else {
    mainApplication.service.push(serviceConfig);
  }
}

function upsertProvider(
  mainApplication: any,
  providerConfig: Record<string, unknown>
): void {
  mainApplication.provider = mainApplication.provider || [];
  const name = (providerConfig.$ as any)['android:name'];
  const existing = mainApplication.provider.find(
    (p: any) => p.$['android:name'] === name
  );
  if (existing) {
    Object.assign(existing, providerConfig);
  } else {
    mainApplication.provider.push(providerConfig);
  }
}

function upsertActivity(
  mainApplication: any,
  activityConfig: Record<string, unknown>
): void {
  mainApplication.activity = mainApplication.activity || [];
  const name = (activityConfig.$ as any)['android:name'];
  const existing = mainApplication.activity.find(
    (a: any) => a.$['android:name'] === name
  );
  if (existing) {
    Object.assign(existing, activityConfig);
  } else {
    mainApplication.activity.push(activityConfig);
  }
}

function commonMeta(props: SystemProps, packageName: string) {
  return [
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
  ];
}

function registerFileProvider(
  cfg: any,
  props: SystemProps,
  packageName: string
): void {
  const className = resolveUserOrLibraryClass({
    packageName,
    projectRoot: cfg.modRequest.projectRoot,
    directory: props.directory,
    targetName: props.name,
    fileBaseName: deepenClassBaseName(props.name, 'DocumentsProvider'),
    libraryDefault: 'expo.modules.targets.system.ExpoTargetsDocumentsProvider',
  });
  const authority =
    props.android?.authority ||
    `${packageName}.expo_targets.documents.${sanitizeTargetSegment(props.name)}`;

  upsertProvider(
    AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults),
    {
      $: {
        'android:name': className,
        'android:authorities': authority,
        'android:exported': 'true',
        'android:grantUriPermissions': 'true',
        'android:permission': 'android.permission.MANAGE_DOCUMENTS',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'android.content.action.DOCUMENTS_PROVIDER',
              },
            },
          ],
        },
      ],
      'meta-data': [
        ...commonMeta(props, packageName),
        {
          $: {
            'android:name': 'expo.targets.AUTHORITY',
            'android:value': authority,
          },
        },
      ],
    }
  );
}

function registerFileProviderUi(
  cfg: any,
  props: SystemProps,
  packageName: string
): void {
  const className = resolveUserOrLibraryClass({
    packageName,
    projectRoot: cfg.modRequest.projectRoot,
    directory: props.directory,
    targetName: props.name,
    fileBaseName: deepenClassBaseName(props.name, 'FileProviderUiActivity'),
    libraryDefault:
      'expo.modules.targets.system.ExpoTargetsFileProviderUiActivity',
  });
  const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
    cfg.modResults
  );
  upsertActivity(mainApplication, {
    $: {
      'android:name': className,
      'android:exported': 'true',
      'android:label': props.displayName || props.name,
      'android:theme': '@android:style/Theme.DeviceDefault.Light.Dialog',
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        ],
        data: [{ $: { 'android:mimeType': '*/*' } }],
      },
    ],
    'meta-data': commonMeta(props, packageName),
  });
}

function registerCredentials(
  cfg: any,
  props: SystemProps,
  packageName: string
): void {
  const className = resolveUserOrLibraryClass({
    packageName,
    projectRoot: cfg.modRequest.projectRoot,
    directory: props.directory,
    targetName: props.name,
    fileBaseName: deepenClassBaseName(props.name, 'AutofillService'),
    libraryDefault: 'expo.modules.targets.system.ExpoTargetsAutofillService',
  });
  const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
    cfg.modResults
  );
  upsertService(mainApplication, {
    $: {
      'android:name': className,
      'android:exported': 'true',
      'android:permission': 'android.permission.BIND_AUTOFILL_SERVICE',
      'android:label': props.displayName || props.name,
    },
    'intent-filter': [
      {
        action: [
          { $: { 'android:name': 'android.service.autofill.AutofillService' } },
        ],
      },
    ],
    'meta-data': [
      ...commonMeta(props, packageName),
      {
        $: {
          'android:name': 'android.autofill',
          'android:resource': '@xml/expo_targets_autofill_service',
        },
      },
    ],
  });
}

function registerKeyboard(
  cfg: any,
  props: SystemProps,
  packageName: string
): void {
  const className = resolveUserOrLibraryClass({
    packageName,
    projectRoot: cfg.modRequest.projectRoot,
    directory: props.directory,
    targetName: props.name,
    fileBaseName: deepenClassBaseName(props.name, 'InputMethodService'),
    libraryDefault: 'expo.modules.targets.system.ExpoTargetsInputMethodService',
  });
  const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
    cfg.modResults
  );
  upsertService(mainApplication, {
    $: {
      'android:name': className,
      'android:exported': 'true',
      'android:permission': 'android.permission.BIND_INPUT_METHOD',
      'android:label':
        props.android?.imeLabel || props.displayName || props.name,
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.view.InputMethod' } }],
      },
    ],
    'meta-data': [
      ...commonMeta(props, packageName),
      {
        $: {
          'android:name': 'android.view.im',
          'android:resource': '@xml/expo_targets_method',
        },
      },
    ],
  });
}

function registerCallDirectory(
  cfg: any,
  props: SystemProps,
  packageName: string
): void {
  const className = resolveUserOrLibraryClass({
    packageName,
    projectRoot: cfg.modRequest.projectRoot,
    directory: props.directory,
    targetName: props.name,
    fileBaseName: deepenClassBaseName(props.name, 'CallScreeningService'),
    libraryDefault:
      'expo.modules.targets.system.ExpoTargetsCallScreeningService',
  });
  ensurePermission(cfg.modResults, 'android.permission.READ_PHONE_STATE');
  const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
    cfg.modResults
  );
  upsertService(mainApplication, {
    $: {
      'android:name': className,
      'android:exported': 'true',
      'android:permission': 'android.permission.BIND_SCREENING_SERVICE',
      'android:label': props.displayName || props.name,
    },
    'intent-filter': [
      {
        action: [
          {
            $: { 'android:name': 'android.telecom.CallScreeningService' },
          },
        ],
      },
    ],
    'meta-data': commonMeta(props, packageName),
  });
}

function registerPrintService(
  cfg: any,
  props: SystemProps,
  packageName: string
): void {
  const className = resolveUserOrLibraryClass({
    packageName,
    projectRoot: cfg.modRequest.projectRoot,
    directory: props.directory,
    targetName: props.name,
    fileBaseName: deepenClassBaseName(props.name, 'PrintService'),
    libraryDefault: 'expo.modules.targets.system.ExpoTargetsPrintService',
  });
  const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
    cfg.modResults
  );
  upsertService(mainApplication, {
    $: {
      'android:name': className,
      'android:exported': 'true',
      'android:permission': 'android.permission.BIND_PRINT_SERVICE',
      'android:label': props.displayName || props.name,
    },
    'intent-filter': [
      {
        action: [
          { $: { 'android:name': 'android.printservice.PrintService' } },
        ],
      },
    ],
    'meta-data': [
      ...commonMeta(props, packageName),
      {
        $: {
          'android:name': 'android.printservice',
          'android:resource': '@xml/expo_targets_print_service',
        },
      },
    ],
  });
}

function registerVpn(cfg: any, props: SystemProps, packageName: string): void {
  const className = resolveUserOrLibraryClass({
    packageName,
    projectRoot: cfg.modRequest.projectRoot,
    directory: props.directory,
    targetName: props.name,
    fileBaseName: deepenClassBaseName(props.name, 'VpnService'),
    libraryDefault: 'expo.modules.targets.system.ExpoTargetsVpnService',
  });
  const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
    cfg.modResults
  );
  upsertService(mainApplication, {
    $: {
      'android:name': className,
      'android:exported': 'false',
      'android:permission': 'android.permission.BIND_VPN_SERVICE',
      'android:label':
        props.android?.vpnDisplayName || props.displayName || props.name,
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.net.VpnService' } }],
      },
    ],
    'meta-data': commonMeta(props, packageName),
  });
}

/**
 * Wave 3 system services: DocumentsProvider, Autofill, IME, CallScreening,
 * PrintService, VpnService (+ file-provider-ui Activity).
 */
export const withAndroidSystemService: ConfigPlugin<SystemProps> = (
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

    switch (props.type) {
      case 'file-provider':
        registerFileProvider(cfg, props, packageName);
        break;
      case 'file-provider-ui':
        registerFileProviderUi(cfg, props, packageName);
        break;
      case 'credentials-provider':
        registerCredentials(cfg, props, packageName);
        break;
      case 'keyboard':
        registerKeyboard(cfg, props, packageName);
        break;
      case 'call-directory':
        registerCallDirectory(cfg, props, packageName);
        break;
      case 'print-service':
        registerPrintService(cfg, props, packageName);
        break;
      case 'network-packet-tunnel':
        registerVpn(cfg, props, packageName);
        break;
      default:
        break;
    }

    return cfg;
  });
};
