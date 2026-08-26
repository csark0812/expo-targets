import { resolveLiveActivityConfig } from '../ios/utils/resolveIosKinds';

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
    kinds?: import('../config').IosKindConfig[];
    liveActivity?: import('../config').LiveActivityConfig;
    intents?: { ui?: boolean | { name?: string } };
    wallet?: { ui?: boolean | { name?: string } };
  };
}

function resolveAppGroup(
  evaluatedConfig: RuntimeTargetConfig,
  expoConfig: { ios?: { entitlements?: Record<string, unknown> } }
): string | undefined {
  if (evaluatedConfig.appGroup) {
    return evaluatedConfig.appGroup;
  }
  const groups =
    expoConfig.ios?.entitlements?.['com.apple.security.application-groups'];
  return Array.isArray(groups) && groups.length > 0
    ? (groups[0] as string)
    : undefined;
}

type CompanionOpts = {
  runtimeConfigs: RuntimeTargetConfig[];
  evaluatedConfig: RuntimeTargetConfig;
  companion: 'intent-ui' | 'wallet-ui';
};

function pushCompanionUi(opts: CompanionOpts): void {
  const { runtimeConfigs, evaluatedConfig, companion } = opts;
  const targetName = evaluatedConfig.name;
  const parent =
    companion === 'intent-ui'
      ? evaluatedConfig.ios?.intents
      : evaluatedConfig.ios?.wallet;
  if (!parent?.ui) {
    return;
  }

  const uiConfig = typeof parent.ui === 'object' ? parent.ui : {};
  const uiName = uiConfig.name || `${targetName}UI`;
  runtimeConfigs.push({
    type: companion,
    name: uiName,
    displayName: `${evaluatedConfig.displayName || targetName} UI`,
    platforms: ['ios'],
    appGroup: evaluatedConfig.appGroup,
  });
}

/** Mirror `withTargetsDir` runtimeConfigs collection for codegen / CLI generate. */
export function collectRuntimeConfigs(
  targets: Array<{ config: RuntimeTargetConfig }>,
  expoConfig: { ios?: { entitlements?: Record<string, unknown> } }
): RuntimeTargetConfig[] {
  const runtimeConfigs: RuntimeTargetConfig[] = [];

  for (const { config: evaluatedConfig } of targets) {
    const appGroup = resolveAppGroup(evaluatedConfig, expoConfig);
    const liveActivity = resolveLiveActivityConfig(evaluatedConfig);
    const withGroup = {
      ...evaluatedConfig,
      appGroup,
      liveActivity: liveActivity ?? evaluatedConfig.liveActivity,
    };

    if (evaluatedConfig.type === 'intent') {
      pushCompanionUi({
        runtimeConfigs,
        evaluatedConfig: withGroup,
        companion: 'intent-ui',
      });
    }
    if (evaluatedConfig.type === 'wallet') {
      pushCompanionUi({
        runtimeConfigs,
        evaluatedConfig: withGroup,
        companion: 'wallet-ui',
      });
    }

    runtimeConfigs.push(withGroup);
  }

  return runtimeConfigs;
}
