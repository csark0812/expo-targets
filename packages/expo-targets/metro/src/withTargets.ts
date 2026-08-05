import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import type { MetroConfig } from 'metro-config';

export interface TargetConfig {
  name: string;
  entry?: string;
}

export interface ScanResult {
  entryMap: Map<string, string>;
  warnings: string[];
}

function loadTargetConfig(
  configPath: string,
  dirName: string,
  warnings: string[]
): TargetConfig | undefined {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as TargetConfig;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(
      `[expo-targets/metro] targets/${dirName}: invalid expo-target.config.json (${message})`
    );
  }
}

function registerTargetEntry(opts: {
  projectRoot: string;
  dirName: string;
  config: TargetConfig;
  entryMap: Map<string, string>;
  warnings: string[];
}): void {
  const { projectRoot, dirName, config, entryMap, warnings } = opts;
  if (!config.entry) {
    return;
  }

  if (!config.name) {
    warnings.push(
      `[expo-targets/metro] targets/${dirName}: config has "entry" but missing "name"`
    );
  }

  const entryPath = path.resolve(projectRoot, config.entry);
  if (!fs.existsSync(entryPath)) {
    warnings.push(
      `[expo-targets/metro] targets/${dirName}: entry "${config.entry}" does not exist (resolved: ${entryPath})`
    );
    return;
  }

  const bundleRoot = config.entry
    .replace(/^\.\//, '')
    .replace(/\.(tsx?|jsx?)$/, '');
  entryMap.set(bundleRoot, entryPath);
}

/**
 * Scan each target's expo-target.config.json for RN entry fields.
 * Exported for tests and tooling.
 */
export function scanTargetsDirectory(projectRoot: string): ScanResult {
  const targetsDir = path.join(projectRoot, 'targets');
  const entryMap = new Map<string, string>();
  const warnings: string[] = [];

  if (!fs.existsSync(targetsDir)) {
    return { entryMap, warnings };
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

    const config = loadTargetConfig(configPath, dir.name, warnings);
    if (config) {
      registerTargetEntry({
        projectRoot,
        dirName: dir.name,
        config,
        entryMap,
        warnings,
      });
    }
  }

  return { entryMap, warnings };
}

function logScanSummary(
  entryMap: Map<string, string>,
  warnings: string[]
): void {
  for (const warning of warnings) {
    console.warn(warning);
  }
  if (entryMap.size === 0) {
    return;
  }
  const roots = [...new Set(entryMap.values())];
  const noun = roots.length === 1 ? 'y' : 'ies';
  console.log(
    `[expo-targets/metro] Resolved ${roots.length} RN extension entr${noun}`
  );
}

export function withTargets(
  metroConfig: MetroConfig,
  options?: { projectRoot?: string; silent?: boolean }
): MetroConfig {
  const projectRoot = options?.projectRoot || process.cwd();
  const { entryMap, warnings } = scanTargetsDirectory(projectRoot);

  if (!options?.silent) {
    logScanSummary(entryMap, warnings);
  }

  const previousResolveRequest = metroConfig.resolver?.resolveRequest;

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

        if (previousResolveRequest) {
          return previousResolveRequest(context, moduleName, platform);
        }

        return context.resolveRequest(context, moduleName, platform);
      },
    },
  };
}

let metroAliasWarned = false;

/** @deprecated Use `withTargets` instead. */
export function withTargetsMetro(
  metroConfig: MetroConfig,
  options?: { projectRoot?: string; silent?: boolean }
): MetroConfig {
  if (!metroAliasWarned) {
    metroAliasWarned = true;
    console.warn(
      '[expo-targets/metro] withTargetsMetro is deprecated; use withTargets instead'
    );
  }
  return withTargets(metroConfig, options);
}
