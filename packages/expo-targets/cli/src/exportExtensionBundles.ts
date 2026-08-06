import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { writePublishLayout } from './extensionBundle/fsInstall';
import {
  exportTargetHermesBundle,
  type HermesExportRunner,
  writeExtensionBundleAssetModules,
} from './extensionBundle/hermesExport';
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

type ExportTargetOpts = {
  projectRoot: string;
  distRoot: string;
  assetsRoot: string | null;
  useHermes: boolean;
  allowPlaceholder?: boolean;
  bundleFiles?: Record<string, string>;
  runHermes?: HermesExportRunner;
  runtimeVersion: string;
};

type ExportTargetResult =
  | { ok: true; bundlePath: string; targetName: string }
  | { ok: false; code: number };

function readTargetBundleBytes(opts: {
  projectRoot: string;
  targetName: string;
  type: string;
  entry: string;
  fromMap?: string;
  allowPlaceholder?: boolean;
  useHermes: boolean;
  runHermes?: HermesExportRunner;
}): Buffer | null {
  if (opts.fromMap && fs.existsSync(opts.fromMap)) {
    return fs.readFileSync(opts.fromMap);
  }
  if (opts.allowPlaceholder) {
    return Buffer.from(
      `// expo-targets placeholder for ${opts.targetName} (${opts.type})\n`
    );
  }
  if (!opts.useHermes) {
    console.warn(
      `[expo-targets] skip ${opts.targetName}: no prebuilt bundle (pass --bundle, enable Hermes export, or --placeholder)`
    );
    return null;
  }

  const tmpOut = path.join(
    opts.projectRoot,
    'node_modules',
    '.cache',
    'expo-targets-export',
    opts.targetName,
    'main.jsbundle'
  );
  const assetsDest = path.join(path.dirname(tmpOut), 'assets');
  try {
    exportTargetHermesBundle({
      projectRoot: opts.projectRoot,
      entryFile: opts.entry,
      bundleOutput: tmpOut,
      assetsDest,
      bytecode: true,
      run: opts.runHermes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[expo-targets] Hermes export failed for ${opts.targetName}: ${message}`
    );
    throw error;
  }
  return fs.readFileSync(tmpOut);
}

function resolveTargetRuntimeVersion(
  target: ReturnType<typeof loadProject>['targets'][number],
  opts: ExportTargetOpts
): string {
  return (
    resolveRuntimeVersion(
      loadProject(opts.projectRoot).expo,
      (target.config as { runtimeVersion?: string }).runtimeVersion
    ) ||
    opts.runtimeVersion ||
    '0.0.0'
  );
}

function copyBundleToAssets(
  assetsRoot: string,
  targetName: string,
  bundlePath: string
): void {
  const dest = path.join(assetsRoot, 'bundles', targetName);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(path.dirname(bundlePath), dest, { recursive: true });
}

function exportSingleTarget(
  target: ReturnType<typeof loadProject>['targets'][number],
  opts: ExportTargetOpts
): ExportTargetResult {
  const { type, name, entry } = target.config;
  if (!(entry && type && RN_NATIVE.has(type))) {
    return { ok: false, code: 0 };
  }

  const targetName = name ?? target.dirName;
  let bytes: Buffer;
  try {
    const read = readTargetBundleBytes({
      projectRoot: opts.projectRoot,
      targetName,
      type,
      entry,
      fromMap: opts.bundleFiles?.[targetName],
      allowPlaceholder: opts.allowPlaceholder,
      useHermes: opts.useHermes,
      runHermes: opts.runHermes,
    });
    if (!read) {
      return { ok: false, code: 0 };
    }
    bytes = read;
  } catch {
    return { ok: false, code: 1 };
  }

  const { bundlePath } = writePublishLayout({
    distRoot: opts.distRoot,
    targetName,
    type,
    runtimeVersion: resolveTargetRuntimeVersion(target, opts),
    bundleBytes: bytes,
  });

  if (opts.assetsRoot) {
    copyBundleToAssets(opts.assetsRoot, targetName, bundlePath);
  }

  console.log(`[expo-targets] exported ${bundlePath}`);
  return { ok: true, bundlePath, targetName };
}

function collectExportedTargets(
  targets: ReturnType<typeof loadProject>['targets'],
  exportOpts: ExportTargetOpts
): { written: string[]; exportedNames: string[]; code: number } {
  const written: string[] = [];
  const exportedNames: string[] = [];
  for (const target of targets) {
    const result = exportSingleTarget(target, exportOpts);
    if (!result.ok) {
      if (result.code !== 0) {
        return { written, exportedNames, code: result.code };
      }
      continue;
    }
    written.push(result.bundlePath);
    exportedNames.push(result.targetName);
  }
  return { written, exportedNames, code: 0 };
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

  if (!(runtimeVersion || opts.allowPlaceholder)) {
    console.error(
      '[expo-targets] runtimeVersion unresolved — set expo.runtimeVersion before export'
    );
    return { code: 1, written: [] };
  }

  const { written, exportedNames, code } = collectExportedTargets(ctx.targets, {
    projectRoot,
    distRoot,
    assetsRoot,
    useHermes,
    allowPlaceholder: opts.allowPlaceholder,
    bundleFiles: opts.bundleFiles,
    runHermes: opts.runHermes,
    runtimeVersion,
  });
  if (code !== 0) {
    return { code, written };
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
