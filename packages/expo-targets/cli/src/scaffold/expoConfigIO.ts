import path from 'node:path';
import fs from 'fs-extra';

const APP_GROUP_KEY = 'com.apple.security.application-groups';

export type JsonExpoConfig = {
  path: string;
  expo: Record<string, unknown>;
};

export function readJsonIfExists(
  filePath: string
): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

export function expoRoot(
  config: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!config) {
    return null;
  }
  if (config.expo && typeof config.expo === 'object') {
    return config.expo as Record<string, unknown>;
  }
  return config;
}

export function findJsonExpoConfig(projectRoot: string): JsonExpoConfig | null {
  for (const name of ['app.json', 'app.config.json']) {
    const filePath = path.join(projectRoot, name);
    const raw = readJsonIfExists(filePath);
    const expo = expoRoot(raw);
    if (expo) {
      return { path: filePath, expo };
    }
  }
  return null;
}

export function hasJsExpoConfig(projectRoot: string): boolean {
  return (
    fs.existsSync(path.join(projectRoot, 'app.config.js')) ||
    fs.existsSync(path.join(projectRoot, 'app.config.ts'))
  );
}

export function writeJsonExpoConfig(
  filePath: string,
  expo: Record<string, unknown>
): void {
  const raw = readJsonIfExists(filePath);
  const payload =
    raw?.expo && typeof raw.expo === 'object' ? { ...raw, expo } : { expo };
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

export function readBundleIdentifier(
  expo: Record<string, unknown>
): string | null {
  const ios = expo.ios as Record<string, unknown> | undefined;
  if (typeof ios?.bundleIdentifier === 'string') {
    return ios.bundleIdentifier;
  }
  return null;
}

export function readAppGroups(expo: Record<string, unknown>): string[] {
  const ios = expo.ios as Record<string, unknown> | undefined;
  const entitlements = ios?.entitlements as Record<string, unknown> | undefined;
  const groups = entitlements?.[APP_GROUP_KEY];
  if (!Array.isArray(groups)) {
    return [];
  }
  return groups.filter((g): g is string => typeof g === 'string');
}

export function ensureAppGroupOnExpo(
  expo: Record<string, unknown>,
  group: string
): boolean {
  const existing = readAppGroups(expo);
  if (existing.length > 0) {
    return false;
  }

  const ios = (expo.ios as Record<string, unknown> | undefined) ?? {};
  const entitlements =
    (ios.entitlements as Record<string, unknown> | undefined) ?? {};
  expo.ios = {
    ...ios,
    entitlements: {
      ...entitlements,
      [APP_GROUP_KEY]: [group],
    },
  };
  return true;
}

export function ensurePluginOnExpo(expo: Record<string, unknown>): boolean {
  const plugins = expo.plugins;
  if (!Array.isArray(plugins)) {
    expo.plugins = ['expo-targets'];
    return true;
  }
  if (plugins.some((p) => p === 'expo-targets' || p?.[0] === 'expo-targets')) {
    return false;
  }
  expo.plugins = [...plugins, 'expo-targets'];
  return true;
}

export const APP_GROUP_ENTITLEMENT_KEY = APP_GROUP_KEY;
