import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  collectRuntimeConfigs,
  formatTargetsTypesFile,
  GENERATED_RELATIVE_PATH,
  widgetKindNamesForCodegen,
} from 'expo-targets/codegen';

import type { CheckResult, ProjectContext } from '../types';

function expectedTypesContents(ctx: ProjectContext): string {
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

  return formatTargetsTypesFile(
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
}

export function checkGeneratedTypes(ctx: ProjectContext): CheckResult[] {
  if (ctx.targets.length === 0) {
    return [];
  }

  const filePath = path.join(ctx.projectRoot, GENERATED_RELATIVE_PATH);
  const expected = expectedTypesContents(ctx);
  const fix = 'Run `npx expo-targets generate` (no full prebuild).';

  if (!fs.existsSync(filePath)) {
    return [
      {
        ok: false,
        level: 'error',
        title: 'Generated types',
        message: `Missing ${GENERATED_RELATIVE_PATH}`,
        fix,
      },
    ];
  }

  const actual = fs.readFileSync(filePath, 'utf8');
  if (actual !== expected) {
    return [
      {
        ok: false,
        level: 'error',
        title: 'Generated types',
        message: `${GENERATED_RELATIVE_PATH} is stale relative to targets/`,
        fix,
      },
    ];
  }

  return [];
}
