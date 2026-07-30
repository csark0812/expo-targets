import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import type { MetroConfig } from 'metro-config';

interface TargetConfig {
  name: string;
  entry?: string;
}

function scanTargetsDirectory(projectRoot: string): Map<string, string> {
  const targetsDir = path.join(projectRoot, 'targets');
  const entryMap = new Map<string, string>();

  if (!fs.existsSync(targetsDir)) {
    return entryMap;
  }

  for (const dir of fs.readdirSync(targetsDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) {
      continue;
    }

    const configPath = path.join(
      targetsDir,
      dir.name,
      'expo-target.config.json'
    );
    if (!fs.existsSync(configPath)) {
      continue;
    }

    try {
      const config: TargetConfig = JSON.parse(
        fs.readFileSync(configPath, 'utf-8')
      );
      if (config.entry) {
        const entryPath = path.resolve(projectRoot, config.entry);
        const bundleRoot = config.entry
          .replace(/^\.\//, '')
          .replace(/\.(tsx?|jsx?)$/, '');
        entryMap.set(bundleRoot, entryPath);
      }
    } catch {
      // Skip invalid configs
    }
  }

  return entryMap;
}

export function withTargetsMetro(
  metroConfig: MetroConfig,
  options?: { projectRoot?: string }
): MetroConfig {
  const projectRoot = options?.projectRoot || process.cwd();
  const entryMap = scanTargetsDirectory(projectRoot);

  if (entryMap.size > 0) {
  }

  return {
    ...metroConfig,
    resolver: {
      ...metroConfig.resolver,
      resolveRequest: (context, moduleName, platform) => {
        const normalized = moduleName.replace(/^\.\//, '');
        const entryPath = entryMap.get(normalized);

        if (entryPath) {
          return { type: 'sourceFile', filePath: entryPath };
        }

        return context.resolveRequest(context, moduleName, platform);
      },
    },
  };
}
