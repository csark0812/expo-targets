import * as fs from 'node:fs';
import * as path from 'node:path';

import type { CheckResult, ProjectContext } from '../types';

function hasEntryTarget(ctx: ProjectContext): boolean {
  return ctx.targets.some((t) => Boolean(t.config.entry));
}

function metroUsesTargets(content: string): boolean {
  return (
    content.includes('withTargets') || content.includes('withTargetsMetro')
  );
}

export function checkMetro(ctx: ProjectContext): CheckResult | null {
  if (!hasEntryTarget(ctx)) {
    return null;
  }

  const metroPath = path.join(ctx.projectRoot, 'metro.config.js');
  if (!fs.existsSync(metroPath)) {
    return {
      ok: false,
      level: 'error',
      title: 'Metro',
      message: 'metro.config.js is missing but targets define RN entries',
      fix:
        'Create metro.config.js:\n' +
        '  const { getDefaultConfig } = require("expo/metro-config");\n' +
        '  const { withTargets } = require("expo-targets/metro");\n' +
        '  module.exports = withTargets(getDefaultConfig(__dirname));',
    };
  }

  const content = fs.readFileSync(metroPath, 'utf8');
  if (metroUsesTargets(content)) {
    return null;
  }

  return {
    ok: false,
    level: 'error',
    title: 'Metro',
    message: 'metro.config.js does not use withTargets (or withTargetsMetro)',
    fix:
      'Wrap your Metro config:\n' +
      '  const { withTargets } = require("expo-targets/metro");\n' +
      '  module.exports = withTargets(getDefaultConfig(__dirname));',
  };
}
