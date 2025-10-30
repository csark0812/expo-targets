import * as fs from 'fs';
import type { MetroConfig } from 'metro-config';
import * as path from 'path';

interface TargetConfig {
  name: string;
  type?: string;
  platforms?: string[];
  entry?: string;
  excludedPackages?: string[];
  ios?: Record<string, any>;
}

interface TargetEntryPoint {
  targetName: string;
  entryPath: string;
  excludedPackages?: string[];
}

function scanTargetsDirectory(projectRoot: string): TargetEntryPoint[] {
  const targetsDir = path.join(projectRoot, 'targets');
  const entryPoints: TargetEntryPoint[] = [];

  if (!fs.existsSync(targetsDir)) {
    return entryPoints;
  }

  const targetDirs = fs.readdirSync(targetsDir, { withFileTypes: true });

  for (const dir of targetDirs) {
    if (!dir.isDirectory()) continue;

    const configPath = path.join(
      targetsDir,
      dir.name,
      'expo-target.config.json'
    );
    if (!fs.existsSync(configPath)) continue;

    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config: TargetConfig = JSON.parse(configContent);

      // Check if config has entry field
      if (config.entry) {
        const entryPath = path.resolve(projectRoot, config.entry);
        entryPoints.push({
          targetName: config.name || dir.name,
          entryPath,
          excludedPackages: config.excludedPackages,
        });
      }
    } catch (error) {
      console.warn(
        `[expo-targets-metro] Failed to parse config for ${dir.name}:`,
        error
      );
    }
  }

  return entryPoints;
}

export function withTargetsMetro(
  metroConfig: MetroConfig,
  options?: {
    projectRoot?: string;
    targets?: string[];
  }
): MetroConfig {
  const projectRoot = options?.projectRoot || process.cwd();
  const targetEntryPoints = scanTargetsDirectory(projectRoot);

  if (targetEntryPoints.length > 0) {
    console.log(
      `[expo-targets-metro] Found ${targetEntryPoints.length} target(s) with React Native entry points:`
    );
    targetEntryPoints.forEach((t) => {
      console.log(`  - ${t.targetName}: ${t.entryPath}`);
    });
  }

  const originalGetTransformOptions =
    metroConfig.transformer?.getTransformOptions;

  return {
    ...metroConfig,
    transformer: {
      ...metroConfig.transformer,
      getTransformOptions: async (
        entryPoints: readonly string[],
        options: any,
        getDependenciesOf: any
      ) => {
        const transformOptions = originalGetTransformOptions
          ? await originalGetTransformOptions(
              entryPoints,
              options,
              getDependenciesOf
            )
          : {};

        return {
          ...transformOptions,
          transform: {
            ...transformOptions.transform,
            experimentalImportSupport: false,
            inlineRequires: true,
          },
        };
      },
    },
    serializer: {
      ...metroConfig.serializer,
      getModulesRunBeforeMainModule: () => [],
    },
  };
}
