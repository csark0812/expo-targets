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
  console.log(`[expo-targets-metro] 🔍 Scanning targets directory...`);
  console.log(`[expo-targets-metro]   Project root: ${projectRoot}`);

  const targetsDir = path.join(projectRoot, 'targets');
  console.log(`[expo-targets-metro]   Targets dir: ${targetsDir}`);

  const entryPoints: TargetEntryPoint[] = [];

  if (!fs.existsSync(targetsDir)) {
    console.log(`[expo-targets-metro]   ⚠️  Targets directory does not exist`);
    return entryPoints;
  }

  const targetDirs = fs.readdirSync(targetsDir, { withFileTypes: true });
  console.log(
    `[expo-targets-metro]   Found ${targetDirs.length} items in targets directory`
  );

  for (const dir of targetDirs) {
    if (!dir.isDirectory()) {
      console.log(
        `[expo-targets-metro]   ⏭  Skipping non-directory: ${dir.name}`
      );
      continue;
    }

    console.log(`[expo-targets-metro]   📁 Checking target: ${dir.name}`);
    const configPath = path.join(
      targetsDir,
      dir.name,
      'expo-target.config.json'
    );

    if (!fs.existsSync(configPath)) {
      console.log(
        `[expo-targets-metro]      ⚠️  No config found at: ${configPath}`
      );
      continue;
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config: TargetConfig = JSON.parse(configContent);
      console.log(
        `[expo-targets-metro]      ✅ Config loaded: name="${config.name}", entry="${config.entry}"`
      );

      // Check if config has entry field
      if (config.entry) {
        const entryPath = path.resolve(projectRoot, config.entry);
        console.log(
          `[expo-targets-metro]      📝 Resolved entry path: ${entryPath}`
        );
        console.log(
          `[expo-targets-metro]      📝 Entry exists: ${fs.existsSync(entryPath)}`
        );

        entryPoints.push({
          targetName: config.name || dir.name,
          entryPath,
          excludedPackages: config.excludedPackages,
        });
      } else {
        console.log(`[expo-targets-metro]      ⏭  No entry field in config`);
      }
    } catch (error) {
      console.warn(
        `[expo-targets-metro] Failed to parse config for ${dir.name}:`,
        error
      );
    }
  }

  console.log(
    `[expo-targets-metro] 📊 Total entry points found: ${entryPoints.length}`
  );
  return entryPoints;
}

export function withTargetsMetro(
  metroConfig: MetroConfig,
  options?: {
    projectRoot?: string;
    targets?: string[];
  }
): MetroConfig {
  console.log(`\n[expo-targets-metro] 🚀 Initializing Metro configuration...`);
  const projectRoot = options?.projectRoot || process.cwd();
  console.log(`[expo-targets-metro] 📂 Using project root: ${projectRoot}`);

  const targetEntryPoints = scanTargetsDirectory(projectRoot);

  if (targetEntryPoints.length > 0) {
    console.log(
      `\n[expo-targets-metro] ✅ Found ${targetEntryPoints.length} target(s) with React Native entry points:`
    );
    targetEntryPoints.forEach((t) => {
      console.log(`  - ${t.targetName}: ${t.entryPath}`);
    });
  } else {
    console.log(
      `\n[expo-targets-metro] ⚠️  No targets with React Native entry points found`
    );
  }

  const originalGetTransformOptions =
    metroConfig.transformer?.getTransformOptions;
  const originalResolveRequest = metroConfig.resolver?.resolveRequest;

  console.log(
    `[expo-targets-metro] 🔧 Setting up custom resolver for target entry points...`
  );

  // Create a map for quick lookup of bundle roots to entry paths
  const bundleRootMap = new Map<string, string>();
  targetEntryPoints.forEach((target) => {
    // Calculate the bundle root that would be used in ReactNativeViewController
    // e.g., "./targets/rn-share/index.tsx" -> "targets/rn-share/index"
    const relativeEntry = path.relative(projectRoot, target.entryPath);
    const bundleRoot = relativeEntry.replace(/\.(tsx?|jsx?)$/, '');
    bundleRootMap.set(bundleRoot, target.entryPath);
    console.log(
      `[expo-targets-metro]   📌 Registered: "${bundleRoot}" -> "${target.entryPath}"`
    );
  });

  return {
    ...metroConfig,
    resolver: {
      ...metroConfig.resolver,
      resolveRequest: (context, moduleName, platform) => {
        // Log all module resolution attempts for targets
        if (moduleName.includes('targets/')) {
          console.log(
            `[expo-targets-metro] 🔍 Resolving module: "${moduleName}" (platform: ${platform})`
          );
        }

        // Check if this matches any of our registered bundle roots
        const normalizedModuleName = moduleName.replace(/^\.\//, '');
        if (bundleRootMap.has(normalizedModuleName)) {
          const resolvedPath = bundleRootMap.get(normalizedModuleName)!;
          console.log(
            `[expo-targets-metro] ✅ Resolved "${moduleName}" -> "${resolvedPath}"`
          );
          return {
            type: 'sourceFile',
            filePath: resolvedPath,
          };
        }

        // Try to match as a prefix (in case extensions are added)
        for (const [bundleRoot, entryPath] of bundleRootMap.entries()) {
          if (normalizedModuleName.startsWith(bundleRoot)) {
            console.log(
              `[expo-targets-metro] ✅ Prefix matched "${moduleName}" -> "${entryPath}"`
            );
            return {
              type: 'sourceFile',
              filePath: entryPath,
            };
          }
        }

        // Fall back to default resolver
        if (originalResolveRequest) {
          return originalResolveRequest(context, moduleName, platform);
        }

        return context.resolveRequest(context, moduleName, platform);
      },
    },
    transformer: {
      ...metroConfig.transformer,
      getTransformOptions: async (
        entryPoints: readonly string[],
        options: any,
        getDependenciesOf: any
      ) => {
        console.log(
          `[expo-targets-metro] 🔄 Transform requested for entry points:`,
          entryPoints
        );

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
      // Don't override getModulesRunBeforeMainModule - let default behavior work
      // This is needed for React Native polyfills like FormData, fetch, etc.
    },
  };
}
