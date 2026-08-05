export type GenerateConfigOptions = {
  type: string;
  kebabName: string;
  pascalName: string;
  platforms: string[];
  useReactNative?: boolean;
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
    config.excludedPackages = ['expo-updates', 'expo-dev-client'];
  }
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
    !options.platforms.includes('ios')
  ) {
    return;
  }
  const attributesName =
    options.liveActivityAttributesName ?? `${options.pascalName}Attributes`;
  config.liveActivity = {
    attributesName,
    static: { title: 'string' },
    contentState: { status: 'string' },
  };
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
  applyIntentIosConfig(config, options);
  applyWalletIosConfig(config, options);
  applyLiveActivityConfig(config, options);
  applyAppIntentIosConfig(config, options);

  return JSON.stringify(config, null, 2);
}
