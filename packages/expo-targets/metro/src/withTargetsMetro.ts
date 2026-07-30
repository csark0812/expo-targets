import * as fs from "node:fs";
import * as path from "node:path";
import process from "node:process";
import type { MetroConfig } from "metro-config";

export interface TargetConfig {
  name: string;
  entry?: string;
}

export interface ScanResult {
  entryMap: Map<string, string>;
  warnings: string[];
}

/**
 * Scan each target's expo-target.config.json for RN entry fields.
 * Exported for tests and tooling.
 */
export function scanTargetsDirectory(projectRoot: string): ScanResult {
  const targetsDir = path.join(projectRoot, "targets");
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
      "expo-target.config.json",
    );
    if (!fs.existsSync(configPath)) {
      continue;
    }

    try {
      const config: TargetConfig = JSON.parse(
        fs.readFileSync(configPath, "utf-8"),
      );
      if (!config.entry) {
        continue;
      }

      if (!config.name) {
        warnings.push(
          "[expo-targets/metro] targets/" +
            dir.name +
            ': config has "entry" but missing "name"',
        );
      }

      const entryPath = path.resolve(projectRoot, config.entry);
      if (!fs.existsSync(entryPath)) {
        warnings.push(
          "[expo-targets/metro] targets/" +
            dir.name +
            ': entry "' +
            config.entry +
            '" does not exist (resolved: ' +
            entryPath +
            ")",
        );
        continue;
      }

      const bundleRoot = config.entry
        .replace(/^\.\//, "")
        .replace(/\.(tsx?|jsx?)$/, "");
      entryMap.set(bundleRoot, entryPath);
    } catch (error) {
      warnings.push(
        "[expo-targets/metro] targets/" +
          dir.name +
          ": invalid expo-target.config.json (" +
          (error instanceof Error ? error.message : String(error)) +
          ")",
      );
    }
  }

  return { entryMap, warnings };
}

export function withTargetsMetro(
  metroConfig: MetroConfig,
  options?: { projectRoot?: string; silent?: boolean },
): MetroConfig {
  const projectRoot = options?.projectRoot || process.cwd();
  const { entryMap, warnings } = scanTargetsDirectory(projectRoot);

  if (!options?.silent) {
    for (const warning of warnings) {
      console.warn(warning);
    }
    if (entryMap.size > 0) {
      const roots = [...new Set(entryMap.values())];
      console.log(
        "[expo-targets/metro] Resolved " +
          roots.length +
          " RN extension entr" +
          (roots.length === 1 ? "y" : "ies"),
      );
    }
  }

  const previousResolveRequest = metroConfig.resolver?.resolveRequest;

  return {
    ...metroConfig,
    resolver: {
      ...metroConfig.resolver,
      resolveRequest: (context, moduleName, platform) => {
        const normalized = moduleName.replace(/^\.\//, "");
        const entryPath = entryMap.get(normalized);

        if (entryPath) {
          return { type: "sourceFile", filePath: entryPath };
        }

        if (previousResolveRequest) {
          return previousResolveRequest(context, moduleName, platform);
        }

        return context.resolveRequest(context, moduleName, platform);
      },
    },
  };
}
