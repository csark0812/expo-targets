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

  // Create a map for quick lookup of target names to bundle roots and entry paths
  const targetMap = new Map<
    string,
    { bundleRoot: string; entryPath: string }
  >();
  targetEntryPoints.forEach((target) => {
    // Calculate the bundle root that would be used in ReactNativeViewController
    // e.g., "./targets/rn-share/index.tsx" -> "targets/rn-share/index"
    const relativeEntry = path.relative(projectRoot, target.entryPath);
    const bundleRoot = relativeEntry.replace(/\.(tsx?|jsx?)$/, '');

    targetMap.set(target.targetName, {
      bundleRoot,
      entryPath: target.entryPath,
    });

    console.log(
      `[expo-targets-metro]   📌 Registered: ${target.targetName} -> "${bundleRoot}"`
    );
  });

  const originalRewriteRequestUrl = metroConfig.server?.rewriteRequestUrl;

  console.log(
    `[expo-targets-metro] 🔧 Setting up URL rewriting for target entry points...`
  );

  return {
    ...metroConfig,
    resolver: {
      ...metroConfig.resolver,
      // Keep custom resolver for initial module resolution
      resolveRequest: (context, moduleName, platform) => {
        // Check if module matches any target bundle root
        const normalizedModuleName = moduleName.replace(/^\.\//, '');

        for (const [
          targetName,
          { bundleRoot, entryPath },
        ] of targetMap.entries()) {
          if (
            normalizedModuleName === bundleRoot ||
            normalizedModuleName.startsWith(bundleRoot)
          ) {
            console.log(
              `[expo-targets-metro] ✅ Resolved "${moduleName}" -> "${entryPath}"`
            );
            return {
              type: 'sourceFile',
              filePath: entryPath,
            };
          }
        }

        // Fall back to default resolver
        return context.resolveRequest(context, moduleName, platform);
      },
    },
    server: {
      ...metroConfig.server,
      rewriteRequestUrl: (url: string) => {
        // Apply original URL rewrite first
        const rewrittenUrl = originalRewriteRequestUrl
          ? originalRewriteRequestUrl(url)
          : url;

        // Check for target query parameter
        const targetMatch = rewrittenUrl.match(/[?&]target=([^&]+)/);

        if (targetMatch) {
          const targetName = targetMatch[1];
          const targetInfo = targetMap.get(targetName);

          if (targetInfo) {
            console.log(
              `[expo-targets-metro] 🔄 Rewriting URL for target: ${targetName}`
            );
            // Keep the bundle root in the URL but flag it as a target bundle
            return rewrittenUrl.replace(
              'index.bundle',
              `index.${targetName}.bundle`
            );
          }
        }

        return rewrittenUrl;
      },
    },
  };
}
