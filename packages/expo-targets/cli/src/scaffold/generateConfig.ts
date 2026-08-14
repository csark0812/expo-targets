export type GenerateConfigOptions = {
  type: string;
  kebabName: string;
  pascalName: string;
  platforms: string[];
  useReactNative?: boolean;
  /** Widget authoring: native deepen or expo-ui Layout entry. */
  widgetUi?: 'native' | 'expo-ui';
  configurableWidget?: boolean;
  includeIntentUi?: boolean;
  appGroup?: string;
  includeLiveActivity?: boolean;
  liveActivityAttributesName?: string;
};

function formatDisplayName(kebabName: string): string {
  return kebabName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function applyReactNativeConfig(
  config: Record<string, unknown>,
  options: GenerateConfigOptions
): void {
  if (options.platforms.includes('ios') && options.useReactNative) {
    config.entry = `./targets/${options.kebabName}/index.tsx`;
  }
}

function applyExpoUiWidgetConfig(
  config: Record<string, unknown>,
  options: GenerateConfigOptions
): void {
  if (options.type !== 'widget' || options.widgetUi !== 'expo-ui') {
    return;
  }
  config.entry = `./targets/${options.kebabName}/index.tsx`;
  if (!options.configurableWidget) {
    return;
  }
  const ios =
    typeof config.ios === 'object' && config.ios
      ? (config.ios as Record<string, unknown>)
      : {};
  ios.configuration = {
    title: `${formatDisplayName(options.kebabName)} Configuration`,
    parameters: {
      listId: {
        title: 'List',
        type: 'string',
        default: 'default',
      },
    },
  };
  config.ios = ios;
}

function applyIntentIosConfig(
  config: Record<string, unknown>,
  options: GenerateConfigOptions
): void {
  if (options.type !== 'intent' || !options.platforms.includes('ios')) {
    return;
  }
  config.ios = {
    intents: {
      intentsSupported: ['INStartWorkoutIntent'],
      ...(options.includeIntentUi && { ui: true }),
    },
  };
}

function applyWalletIosConfig(
  config: Record<string, unknown>,
  options: GenerateConfigOptions
): void {
  if (options.type !== 'wallet' || !options.platforms.includes('ios')) {
    return;
  }
  config.ios = {
    wallet: {
      ui: true,
    },
  };
}

function applyLiveActivityConfig(
  config: Record<string, unknown>,
  options: GenerateConfigOptions
): void {
  if (
    options.type !== 'widget' ||
    !options.includeLiveActivity ||
    !(
      options.platforms.includes('ios') || options.platforms.includes('android')
    )
  ) {
    return;
  }
  const attributesName =
    options.liveActivityAttributesName ?? `${options.pascalName}Attributes`;
  const ios =
    typeof config.ios === 'object' && config.ios
      ? (config.ios as Record<string, unknown>)
      : {};
  const kinds = Array.isArray(ios.kinds) ? [...ios.kinds] : [];
  if (options.widgetUi === 'expo-ui') {
    const configuration = ios.configuration;
    delete ios.configuration;
    kinds.unshift({
      name: options.pascalName,
      displayName: formatDisplayName(options.kebabName),
      ...(configuration ? { configuration } : {}),
    });
  }
  kinds.push({
    type: 'live-activity',
    attributesName,
    static: { title: 'string' },
    contentState: { status: 'string' },
  });
  ios.kinds = kinds;
  config.ios = ios;
}

function applyAppIntentIosConfig(
  config: Record<string, unknown>,
  options: GenerateConfigOptions
): void {
  if (options.type !== 'app-intent' || !options.platforms.includes('ios')) {
    return;
  }
  const className = `${options.pascalName}Intent`;
  const performHook = `${options.pascalName}IntentPerform`;
  const title = formatDisplayName(options.kebabName);
  config.ios = {
    appIntents: [
      {
        className,
        title,
        description: `${title} shortcut`,
        openAppWhenRun: true,
        performHook,
      },
    ],
    appShortcuts: [
      {
        intent: className,
        phrases: [`Run ${title} in \\(.applicationName)`],
        shortTitle: title,
        systemImageName: 'app',
      },
    ],
  };
}

function applyAndroidWidgetConfig(
  config: Record<string, unknown>,
  options: GenerateConfigOptions,
  configType: string
): void {
  if (options.platforms.includes('android') && configType === 'widget') {
    config.android = {
      widgetType: 'glance',
    };
  }
}

function applyAndroidShareActionConfig(
  config: Record<string, unknown>,
  options: GenerateConfigOptions,
  configType: string
): void {
  if (!options.platforms.includes('android')) {
    return;
  }
  if (configType !== 'share' && configType !== 'action') {
    return;
  }
  config.android = {
    ...(typeof config.android === 'object' && config.android
      ? (config.android as Record<string, unknown>)
      : {}),
    activationRules: [
      { type: 'text' },
      { type: 'url' },
      { type: 'image', maxCount: 5 },
    ],
  };
}

function applyAndroidNotificationConfig(
  config: Record<string, unknown>,
  options: GenerateConfigOptions,
  configType: string
): void {
  if (!options.platforms.includes('android')) {
    return;
  }
  if (
    configType !== 'notification-service' &&
    configType !== 'notification-content'
  ) {
    return;
  }
  config.android = {
    ...(typeof config.android === 'object' && config.android
      ? (config.android as Record<string, unknown>)
      : {}),
    channelId: `expo_targets_${options.kebabName.replace(/-/g, '_')}`,
    channelName: formatDisplayName(options.kebabName),
    ...(configType === 'notification-content'
      ? { category: 'myNotificationCategory' }
      : { mutationMarker: ' [expo-targets]' }),
  };
}

function applyAndroidSystemConfig(
  config: Record<string, unknown>,
  options: GenerateConfigOptions,
  configType: string
): void {
  const systemTypes = new Set([
    'file-provider',
    'file-provider-ui',
    'credentials-provider',
    'keyboard',
    'call-directory',
    'print-service',
    'network-packet-tunnel',
  ]);
  if (!(options.platforms.includes('android') && systemTypes.has(configType))) {
    return;
  }
  const android: Record<string, unknown> = {
    ...(typeof config.android === 'object' && config.android
      ? (config.android as Record<string, unknown>)
      : {}),
  };
  if (configType === 'keyboard') {
    android.imeLabel = formatDisplayName(options.kebabName);
  }
  if (configType === 'network-packet-tunnel') {
    android.vpnDisplayName = formatDisplayName(options.kebabName);
  }
  config.android = android;
}

export function generateConfig(options: GenerateConfigOptions): string {
  const configType = options.type === 'imessage' ? 'stickers' : options.type;
  const config: Record<string, unknown> = {
    type: configType,
    name: options.pascalName,
    displayName: formatDisplayName(options.kebabName),
    platforms: options.platforms,
  };

  if (options.appGroup) {
    config.appGroup = options.appGroup;
  }

  applyReactNativeConfig(config, options);
  applyExpoUiWidgetConfig(config, options);
  applyIntentIosConfig(config, options);
  applyWalletIosConfig(config, options);
  applyLiveActivityConfig(config, options);
  applyAppIntentIosConfig(config, options);
  applyAndroidWidgetConfig(config, options, configType);
  applyAndroidShareActionConfig(config, options, configType);
  applyAndroidNotificationConfig(config, options, configType);
  applyAndroidSystemConfig(config, options, configType);

  return JSON.stringify(config, null, 2);
}
