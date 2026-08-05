import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CheckResult, ProjectContext } from '../types';

export function checkEntries(ctx: ProjectContext): CheckResult[] {
  const failures: CheckResult[] = [];

  for (const target of ctx.targets) {
    const entry = target.config.entry;
    if (!entry) {
      continue;
    }

    const name = target.config.name ?? target.dirName;
    const resolved = path.resolve(ctx.projectRoot, entry);
    if (fs.existsSync(resolved)) {
      continue;
    }

    failures.push({
      ok: false,
      level: 'error',
      title: 'Entry files',
      message: `Target "${name}": entry "${entry}" does not exist`,
      fix: `Create ${entry} or update expo-target.config.json`,
    });
  }

  return failures;
}
