import * as path from 'node:path';
import { globSync } from 'glob';

export const TARGET_CONFIG_BASENAME = 'target.config';
export const LEGACY_TARGET_CONFIG_BASENAME = 'expo-target.config';

const EXT_GLOB = '@(js|ts|json)';

export function isLegacyTargetConfigPath(configPath: string): boolean {
  return path
    .basename(configPath)
    .startsWith(`${LEGACY_TARGET_CONFIG_BASENAME}.`);
}

/**
 * Find one config per target directory. `target.config.*` wins over
 * `expo-target.config.*` when both exist.
 */
export function discoverTargetConfigFiles(opts: {
  targetsRoot: string;
  cwd: string;
}): string[] {
  const { targetsRoot, cwd } = opts;
  const found = new Map<string, string>();

  const legacy = globSync(
    `${targetsRoot}/*/${LEGACY_TARGET_CONFIG_BASENAME}.${EXT_GLOB}`,
    { cwd, absolute: true }
  );
  const current = globSync(
    `${targetsRoot}/*/${TARGET_CONFIG_BASENAME}.${EXT_GLOB}`,
    { cwd, absolute: true }
  );

  for (const file of legacy) {
    found.set(path.dirname(file), file);
  }
  for (const file of current) {
    found.set(path.dirname(file), file);
  }

  return [...found.values()].sort();
}
