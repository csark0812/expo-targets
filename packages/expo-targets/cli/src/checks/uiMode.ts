import { isIllegalUiMode, resolveUiMode } from '../../../plugin/build/domain';
import type { CheckResult, ProjectContext } from '../types';

export function checkUiMode(ctx: ProjectContext): CheckResult[] {
  const results: CheckResult[] = [];

  for (const target of ctx.targets) {
    const name = target.config.name ?? target.dirName;
    const illegal = isIllegalUiMode(target.config);
    if (illegal) {
      results.push({
        ok: false,
        level: 'error',
        title: 'UI mode',
        message: `Target "${name}": ${illegal}`,
        fix: `Fix ui / entry in targets/${target.dirName}/expo-target.config.json`,
      });
      continue;
    }

    void resolveUiMode(target.config);
  }

  return results;
}
