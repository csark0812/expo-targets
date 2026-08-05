import * as fs from 'node:fs';
import * as path from 'node:path';
import { globSync } from 'glob';

import type { DiscoveredTarget, ProjectContext, TargetConfig } from './types';

const APP_GROUP_KEY = 'com.apple.security.application-groups';

function readJson(filePath: string): Record<string, unknown> | null {
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

function expoRoot(
  raw: Record<string, unknown> | null
): Record<string, unknown> {
  if (raw?.expo && typeof raw.expo === 'object') {
    return raw.expo as Record<string, unknown>;
  }
  return raw ?? {};
}

function loadExpoConfig(projectRoot: string): Record<string, unknown> {
  for (const name of ['app.json', 'app.config.json']) {
    const root = expoRoot(readJson(path.join(projectRoot, name)));
    if (Object.keys(root).length > 0) {
      return root;
    }
  }

  const jsConfig = path.join(projectRoot, 'app.config.js');
  if (fs.existsSync(jsConfig)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(jsConfig);
      const cfg = typeof mod === 'function' ? mod({}) : mod;
      return expoRoot(cfg);
    } catch {
      return {};
    }
  }

  return {};
}

function readHostAppGroups(expo: Record<string, unknown>): string[] {
  const ios = expo.ios as Record<string, unknown> | undefined;
  const entitlements = ios?.entitlements as Record<string, unknown> | undefined;
  const groups = entitlements?.[APP_GROUP_KEY];
  if (!Array.isArray(groups)) {
    return [];
  }
  return groups.filter((g): g is string => typeof g === 'string');
}

function evaluateTargetConfig(
  configPath: string,
  expo: Record<string, unknown>
): TargetConfig {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let evaluated = require(configPath);
  if (evaluated?.default) {
    evaluated = evaluated.default;
  }
  if (typeof evaluated === 'function') {
    evaluated = evaluated(expo);
  }
  return evaluated as TargetConfig;
}

function discoverTargets(
  projectRoot: string,
  expo: Record<string, unknown>
): DiscoveredTarget[] {
  const files = globSync('./targets/*/expo-target.config.@(js|ts|json)', {
    cwd: projectRoot,
    absolute: true,
  });

  return files.map((configPath) => {
    const dirName = path.basename(path.dirname(configPath));
    return {
      dirName,
      configPath,
      config: evaluateTargetConfig(configPath, expo),
    };
  });
}

export function loadProject(projectRoot: string): ProjectContext {
  const expo = loadExpoConfig(projectRoot);
  return {
    projectRoot,
    expo,
    plugins: Array.isArray(expo.plugins) ? expo.plugins : [],
    hostAppGroups: readHostAppGroups(expo),
    targets: discoverTargets(projectRoot, expo),
  };
}
