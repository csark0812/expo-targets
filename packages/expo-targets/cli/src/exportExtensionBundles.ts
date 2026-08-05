import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';

import {
  exportTargetHermesBundle,
  type HermesExportRunner,
  writeExtensionBundleAssetModules,
} from './extensionBundle/hermesExport';
import { writePublishLayout } from './extensionBundle/fsInstall';
import { loadProject } from './project';

const RN_NATIVE = new Set([
  'share',
  'action',
  'clip',
  'messages',
  'notification-content',
]);

function resolveRuntimeVersion(
  expo: Record<string, unknown>,
  override?: string
): string {
  if (override) {
    return override;
  }
  const top = expo.runtimeVersion;
  if (typeof top === 'string' && top) {
    return top;
  }
  const updates = expo.updates as { runtimeVersion?: string } | undefined;
  if (typeof updates?.runtimeVersion === 'string' && updates.runtimeVersion) {
    return updates.runtimeVersion;
  }
  return '';
}

/**
 * Export extension bundles into dist/expo-targets/bundles for eas update assets,
 * and into assets/expo-targets for Metro `require` + Asset.fromModule on the host.
 */
export function runExportExtensionBundles(opts: {
  projectRoot?: string;
  distRoot?: string;
  /** Also copy publish layout here (default: `<project>/assets/expo-targets`). `false` skips. */
  assetsRoot?: string | false;
  bundleFiles?: Record<string, string>;
  allowPlaceholder?: boolean;
  /** When true (default), run `expo export:embed --bytecode` for each entry. */
  hermes?: boolean;
  runHermes?: HermesExportRunner;
}): { code: number; written: string[]; assetModulesPath?: string } {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const distRoot = opts.distRoot ?? path.join(projectRoot, 'dist');
  const assetsRoot =
    opts.assetsRoot === false
      ? null
      : (opts.assetsRoot ?? path.join(projectRoot, 'assets', 'expo-targets'));
  const useHermes = opts.hermes !== false && !opts.allowPlaceholder;
  const ctx = loadProject(projectRoot);
  const runtimeVersion = resolveRuntimeVersion(ctx.expo);
  const written: string[] = [];
  const exportedNames: string[] = [];

  if (!runtimeVersion && !opts.allowPlaceholder) {
    console.error(
      '[expo-targets] runtimeVersion unresolved — set expo.runtimeVersion before export'
    );
    return { code: 1, written };
  }

  for (const target of ctx.targets) {
    const { type, name, entry } = target.config;
    if (!entry || !type || !RN_NATIVE.has(type)) {
      continue;
    }
    const targetName = name ?? target.dirName;
    const rv =
      resolveRuntimeVersion(
        ctx.expo,
        (target.config as { runtimeVersion?: string }).runtimeVersion
      ) ||
      runtimeVersion ||
      '0.0.0';

    let bytes: Buffer;
    const fromMap = opts.bundleFiles?.[targetName];
    if (fromMap && fs.existsSync(fromMap)) {
      bytes = fs.readFileSync(fromMap);
    } else if (opts.allowPlaceholder) {
      bytes = Buffer.from(
        `// expo-targets placeholder for ${targetName} (${type})\n`
      );
    } else if (useHermes) {
      const tmpOut = path.join(
        projectRoot,
        'node_modules',
        '.cache',
        'expo-targets-export',
        targetName,
        'main.jsbundle'
      );
      const assetsDest = path.join(path.dirname(tmpOut), 'assets');
      try {
        exportTargetHermesBundle({
          projectRoot,
          entryFile: entry,
          bundleOutput: tmpOut,
          assetsDest,
          bytecode: true,
          run: opts.runHermes,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[expo-targets] Hermes export failed for ${targetName}: ${message}`
        );
        return { code: 1, written };
      }
      bytes = fs.readFileSync(tmpOut);
    } else {
      console.warn(
        `[expo-targets] skip ${targetName}: no prebuilt bundle (pass --bundle, enable Hermes export, or --placeholder)`
      );
      continue;
    }

    const { bundlePath } = writePublishLayout({
      distRoot,
      targetName,
      type,
      runtimeVersion: rv,
      bundleBytes: bytes,
    });
    written.push(bundlePath);
    exportedNames.push(targetName);

    if (assetsRoot) {
      const dest = path.join(assetsRoot, 'bundles', targetName);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(path.dirname(bundlePath), dest, { recursive: true });
    }

    console.log(`[expo-targets] exported ${bundlePath}`);
  }

  let assetModulesPath: string | undefined;
  if (assetsRoot && exportedNames.length > 0) {
    assetModulesPath = writeExtensionBundleAssetModules({
      assetsRoot,
      targetNames: exportedNames,
    });
    console.log(`[expo-targets] wrote ${assetModulesPath}`);
  }

  return { code: 0, written, assetModulesPath };
}
