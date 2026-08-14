import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CheckResult, ProjectContext } from '../types';

function hasGalleryKinds(
  kinds: { type?: string; name?: string }[] | undefined
): boolean {
  return Boolean(
    kinds?.some((kind) => kind.type !== 'live-activity' && kind.name)
  );
}

/** Warn when expo-ui kinds generate a sealed Bundle and a user Bundle.swift is leftover. */
export function warnUnusedWidgetBundle(ctx: ProjectContext): CheckResult[] {
  const warnings: CheckResult[] = [];
  for (const target of ctx.targets) {
    if (target.config.type !== 'widget' || !target.config.entry) {
      continue;
    }
    if (!hasGalleryKinds(target.config.ios?.kinds)) {
      continue;
    }
    const name = target.config.name;
    if (!name) {
      continue;
    }
    const bundlePath = path.join(
      path.dirname(target.configPath),
      'ios',
      `${name}Bundle.swift`
    );
    if (!fs.existsSync(bundlePath)) {
      continue;
    }
    warnings.push({
      ok: true,
      level: 'warn',
      title: 'Unused widget Bundle',
      message: `targets/${target.dirName}/ios/${name}Bundle.swift is not compiled when ios.kinds lists gallery widgets. The sealed generated Bundle is used instead.`,
      fix: `Delete targets/${target.dirName}/ios/${name}Bundle.swift after you confirm the generated Bundle.`,
    });
  }
  return warnings;
}
