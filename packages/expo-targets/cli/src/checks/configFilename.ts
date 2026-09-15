import { isLegacyTargetConfigPath } from '../targetConfigFile';
import type { CheckResult, ProjectContext } from '../types';

export function warnLegacyConfigName(ctx: ProjectContext): CheckResult[] {
  return ctx.targets
    .filter((target) => isLegacyTargetConfigPath(target.configPath))
    .map((target) => ({
      ok: false,
      level: 'warn' as const,
      title: 'Config filename',
      message: `targets/${target.dirName}: expo-target.config.* is renamed to target.config.*`,
      fix: `Rename targets/${target.dirName}/expo-target.config.* to target.config.json (or .ts / .js)`,
    }));
}
