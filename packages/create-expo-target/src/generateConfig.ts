export type GenerateConfigOptions = {
  type: string;
  kebabName: string;
  pascalName: string;
  platforms: string[];
  useReactNative?: boolean;
  includeIntentUi?: boolean;
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

export function generateConfig(options: GenerateConfigOptions): string {
  const configType = options.type === 'imessage' ? 'stickers' : options.type;
  const config: Record<string, unknown> = {
    type: configType,
    name: options.pascalName,
    displayName: formatDisplayName(options.kebabName),
    platforms: options.platforms,
  };

  applyReactNativeConfig(config, options);
  applyIntentIosConfig(config, options);
  applyWalletIosConfig(config, options);

  return JSON.stringify(config, null, 2);
}
