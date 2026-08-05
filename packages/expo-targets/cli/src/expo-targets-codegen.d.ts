declare module 'expo-targets/codegen' {
  export interface RuntimeTargetConfig {
    name: string;
    type?: string;
    displayName?: string;
    platforms?: string[];
    appGroup?: string;
    liveActivity?: { attributesName?: string };
    ios?: {
      intents?: { ui?: boolean | { name?: string } };
      wallet?: { ui?: boolean | { name?: string } };
    };
  }

  export function collectRuntimeConfigs(
    targets: Array<{ config: RuntimeTargetConfig }>,
    expoConfig: { ios?: { entitlements?: Record<string, unknown> } }
  ): RuntimeTargetConfig[];

  export function writeTargetsTypesFile(
    projectRoot: string,
    configs: Array<{
      name: string;
      liveActivity?: { attributesName?: string };
    }>
  ): string;
}
