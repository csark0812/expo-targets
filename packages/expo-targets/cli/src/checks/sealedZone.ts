import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import { globSync } from 'glob';

import type { CheckResult, ProjectContext } from '../types';

function sealedDirs(projectRoot: string): string[] {
  return globSync('ios/*/ExpoTargetsGenerated', {
    cwd: projectRoot,
    absolute: true,
  });
}

function gitTrackedSealed(projectRoot: string): string[] {
  try {
    const out = execSync('git ls-files -- "ios/*/ExpoTargetsGenerated"', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out ? out.split('\n') : [];
  } catch {
    return [];
  }
}

function gitDirtySealed(projectRoot: string): string[] {
  try {
    const out = execSync(
      'git status --porcelain -- "ios/*/ExpoTargetsGenerated"',
      {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    ).trim();
    return out ? out.split('\n').map((line) => line.slice(3)) : [];
  } catch {
    return [];
  }
}

export function warnSealedZone(ctx: ProjectContext): CheckResult[] {
  const dirs = sealedDirs(ctx.projectRoot);
  if (dirs.length === 0) {
    return [];
  }

  const warnings: CheckResult[] = [];
  const tracked = gitTrackedSealed(ctx.projectRoot);
  if (tracked.length > 0) {
    warnings.push({
      ok: false,
      level: 'warn',
      title: 'Sealed zone',
      message: `${tracked.length} file(s) under ExpoTargetsGenerated are tracked by git`,
      fix: 'Remove from git; deepen under targets/<name>/ios/ instead',
    });
  }

  const dirty = gitDirtySealed(ctx.projectRoot);
  if (dirty.length > 0) {
    warnings.push({
      ok: false,
      level: 'warn',
      title: 'Sealed zone',
      message: `ExpoTargetsGenerated has ${dirty.length} uncommitted change(s)`,
      fix: 'Do not hand-edit ios/*/ExpoTargetsGenerated — move changes to targets/*/ios/',
    });
  }

  const hasContent = dirs.some((dir) => fs.readdirSync(dir).length > 0);
  if (hasContent && warnings.length === 0) {
    warnings.push({
      ok: false,
      level: 'warn',
      title: 'Sealed zone',
      message: 'ExpoTargetsGenerated exists (CNG output)',
      fix: 'Never edit ios/*/ExpoTargetsGenerated — deepen under targets/<name>/ios/',
    });
  }

  return warnings;
}
