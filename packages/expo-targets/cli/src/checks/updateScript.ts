import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CheckResult, ProjectContext } from '../types';

const RN_NATIVE = new Set([
  'share',
  'action',
  'clip',
  'messages',
  'notification-content',
]);

function hasRnNativeEntry(ctx: ProjectContext): boolean {
  return ctx.targets.some(
    (t) =>
      t.config.entry && t.config.type && RN_NATIVE.has(t.config.type as string)
  );
}

function scriptMentionsExport(script: string | undefined): boolean {
  if (!script) {
    return false;
  }
  return script.includes('export-extension-bundles');
}

/**
 * Warn when RN extension entries exist but publish scripts never export
 * Hermes bundles before a normal `eas update`.
 */
export function warnExtensionBundleExport(ctx: ProjectContext): CheckResult[] {
  if (!hasRnNativeEntry(ctx)) {
    return [];
  }

  const pkgPath = path.join(ctx.projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return [];
  }

  let scripts: Record<string, string> = {};
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    scripts = pkg.scripts ?? {};
  } catch {
    return [];
  }

  const candidates = [
    scripts.update,
    scripts['eas:update'],
    scripts['eas-update'],
    scripts.export,
    scripts['export:targets'],
    scripts['export-extension-bundles'],
  ];

  if (candidates.some(scriptMentionsExport)) {
    return [];
  }

  const assetsModules = path.join(
    ctx.projectRoot,
    'assets',
    'expo-targets',
    'extensionBundleModules.js'
  );
  if (fs.existsSync(assetsModules)) {
    return [];
  }

  return [
    {
      ok: false,
      level: 'warn',
      title: 'Extension bundle export',
      message:
        'RN extension entries found, but nothing runs `expo-targets export-extension-bundles` before publish',
      fix: 'Run `npx expo-targets export-extension-bundles` then `eas update` (or add that export to your update/export script) so Hermes extension bundles ship as host update assets',
    },
  ];
}
