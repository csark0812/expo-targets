import path from 'node:path';
import fs from 'fs-extra';

const METRO_SNIPPET = `const { getDefaultConfig } = require('expo/metro-config');
const { withTargets } = require('expo-targets/metro');

module.exports = withTargets(getDefaultConfig(__dirname));
`;

const METRO_REQUIRE = `const { withTargets } = require('expo-targets/metro');`;

export type MetroWireResult =
  | { ok: true; created?: boolean; patched?: boolean }
  | { ok: false; reason: 'exotic'; snippet: string };

function alreadyWrapped(content: string): boolean {
  return (
    content.includes('withTargets') || content.includes('withTargetsMetro')
  );
}

function patchDirectExport(content: string): string | null {
  const direct = /module\.exports\s*=\s*getDefaultConfig\(\s*__dirname\s*\)/;
  if (!direct.test(content)) {
    return null;
  }
  if (!content.includes(METRO_REQUIRE)) {
    content = content.replace(
      /const\s*\{\s*getDefaultConfig\s*\}\s*=\s*require\(\s*['"]expo\/metro-config['"]\s*\);?/,
      `$&\n${METRO_REQUIRE}`
    );
  }
  return content.replace(
    direct,
    'module.exports = withTargets(getDefaultConfig(__dirname))'
  );
}

function patchConfigExport(content: string): string | null {
  const exportConfig = /module\.exports\s*=\s*config\s*;?/;
  if (!exportConfig.test(content)) {
    return null;
  }
  if (!content.includes('getDefaultConfig')) {
    return null;
  }
  if (!content.includes(METRO_REQUIRE)) {
    content = content.replace(
      /const\s*\{\s*getDefaultConfig\s*\}\s*=\s*require\(\s*['"]expo\/metro-config['"]\s*\);?/,
      `$&\n${METRO_REQUIRE}`
    );
  }
  return content.replace(exportConfig, 'module.exports = withTargets(config);');
}

export function wireMetroConfig(projectRoot: string): MetroWireResult {
  const metroPath = path.join(projectRoot, 'metro.config.js');
  if (!fs.existsSync(metroPath)) {
    fs.writeFileSync(metroPath, METRO_SNIPPET);
    return { ok: true, created: true };
  }

  const content = fs.readFileSync(metroPath, 'utf8');
  if (alreadyWrapped(content)) {
    return { ok: true };
  }

  const directPatched = patchDirectExport(content);
  if (directPatched) {
    fs.writeFileSync(metroPath, directPatched);
    return { ok: true, patched: true };
  }

  const configPatched = patchConfigExport(content);
  if (configPatched) {
    fs.writeFileSync(metroPath, configPatched);
    return { ok: true, patched: true };
  }

  return { ok: false, reason: 'exotic', snippet: METRO_SNIPPET };
}
