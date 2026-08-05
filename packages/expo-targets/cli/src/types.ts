export type CheckLevel = 'error' | 'warn';

export interface CheckResult {
  ok: boolean;
  level: CheckLevel;
  title: string;
  message: string;
  fix?: string;
}

export interface TargetConfig {
  type?: string;
  name?: string;
  displayName?: string;
  platforms?: string[];
  entry?: string;
  appGroup?: string;
  liveActivity?: { attributesName?: string };
  ios?: {
    intents?: { ui?: boolean | { name?: string } };
    wallet?: { ui?: boolean | { name?: string } };
  };
}

export interface DiscoveredTarget {
  dirName: string;
  configPath: string;
  config: TargetConfig;
}

export interface ProjectContext {
  projectRoot: string;
  expo: Record<string, unknown>;
  plugins: unknown[];
  hostAppGroups: string[];
  targets: DiscoveredTarget[];
}
