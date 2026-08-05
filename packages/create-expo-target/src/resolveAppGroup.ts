import path from 'node:path';
import process from 'node:process';
import fs from 'fs-extra';

/**
 * Resolve the host App Group suite from app.json / app.config.* entitlements.
 * Falls back to a derived group.<bundleIdentifier> when missing.
 */
export function resolveAppGroup(projectRoot: string = process.cwd()): string {
  const fromConfig = readAppGroupFromExpoConfig(projectRoot);
  if (fromConfig) return fromConfig;

  const bundleId = readBundleIdentifier(projectRoot);
  if (bundleId) return `group.${bundleId}`;

  return 'group.com.example.app';
}

function readJsonIfExists(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function expoRoot(
  config: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!config) return null;
  if (config.expo && typeof config.expo === 'object') {
    return config.expo as Record<string, unknown>;
  }
  return config;
}

function readAppGroupFromExpoConfig(projectRoot: string): string | null {
  for (const name of ['app.json', 'app.config.json']) {
    const root = expoRoot(readJsonIfExists(path.join(projectRoot, name)));
    if (!root) continue;
    const ios = root.ios as Record<string, unknown> | undefined;
    const entitlements = ios?.entitlements as Record<string, unknown> | undefined;
    const groups = entitlements?.['com.apple.security.application-groups'];
    if (Array.isArray(groups) && typeof groups[0] === 'string') {
      return groups[0];
    }
  }
  return null;
}

function readBundleIdentifier(projectRoot: string): string | null {
  for (const name of ['app.json', 'app.config.json']) {
    const root = expoRoot(readJsonIfExists(path.join(projectRoot, name)));
    if (!root) continue;
    const ios = root.ios as Record<string, unknown> | undefined;
    if (typeof ios?.bundleIdentifier === 'string') {
      return ios.bundleIdentifier;
    }
  }
  return null;
}
