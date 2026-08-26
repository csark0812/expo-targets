import process from 'node:process';
import {
  collectRuntimeConfigs,
  widgetKindNamesForCodegen,
  writeTargetsTypesFile,
} from 'expo-targets/codegen';

import { loadProject } from './project';

export function runGenerate(projectRoot = process.cwd()): number {
  const ctx = loadProject(projectRoot);
  const runtimeConfigs = collectRuntimeConfigs(
    ctx.targets
      .filter((target) => Boolean(target.config.name))
      .map((target) => ({
        config:
          target.config as import('expo-targets/codegen').RuntimeTargetConfig,
      })),
    {
      ios: ctx.expo.ios as
        | { entitlements?: Record<string, unknown> }
        | undefined,
    }
  );

  const outputPath = writeTargetsTypesFile(
    projectRoot,
    runtimeConfigs.map((cfg) => ({
      name: cfg.name,
      type: cfg.type,
      ios: cfg.ios,
      android: cfg.android,
      widgetKinds: widgetKindNamesForCodegen(cfg),
      liveActivity: cfg.liveActivity,
      liveActivities: cfg.liveActivities,
    }))
  );

  console.log(`Wrote ${outputPath}`);
  return 0;
}
