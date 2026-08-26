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
      widgetKinds: widgetKindNamesForCodegen(cfg),
      liveActivity: cfg.liveActivity
        ? {
            attributesName: cfg.liveActivity.attributesName,
            static: cfg.liveActivity.static,
            contentState: cfg.liveActivity.contentState,
          }
        : undefined,
    }))
  );

  console.log(`Wrote ${outputPath}`);
  return 0;
}
