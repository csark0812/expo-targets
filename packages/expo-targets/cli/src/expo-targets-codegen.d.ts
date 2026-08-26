declare module 'expo-targets/codegen' {
  export type LiveActivityFieldType = 'string' | 'double' | 'int' | 'bool';

  export interface RuntimeTargetConfig {
    name: string;
    type?: string;
    displayName?: string;
    platforms?: string[];
    appGroup?: string;
    liveActivity?: {
      attributesName?: string;
      static?: Record<string, LiveActivityFieldType>;
      contentState?: Record<string, LiveActivityFieldType>;
    };
    ios?: {
      intents?: { ui?: boolean | { name?: string } };
      wallet?: { ui?: boolean | { name?: string } };
    };
  }

  export function collectRuntimeConfigs(
    targets: Array<{ config: RuntimeTargetConfig }>,
    expoConfig: { ios?: { entitlements?: Record<string, unknown> } }
  ): RuntimeTargetConfig[];

  export function widgetKindNamesForCodegen(
    cfg: Pick<RuntimeTargetConfig, 'name' | 'ios'>
  ): string[];

  export function writeTargetsTypesFile(
    projectRoot: string,
    configs: Array<{
      name: string;
      widgetKinds?: string[];
      liveActivity?: {
        attributesName?: string;
        static?: Record<string, LiveActivityFieldType>;
        contentState?: Record<string, LiveActivityFieldType>;
      };
    }>
  ): string;

  export function ensureTsconfigExpoTypesInclude(projectRoot: string): boolean;

  export const GENERATED_RELATIVE_PATH: string;
}
