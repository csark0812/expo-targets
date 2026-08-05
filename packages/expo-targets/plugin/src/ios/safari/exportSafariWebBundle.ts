import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import * as Paths from '../utils/paths';

export interface SafariWebBundleTarget {
  entryFile: string;
  productName: string;
}

export interface ExportSafariWebBundleOptions {
  projectRoot: string;
  platformProjectRoot: string;
  projectName: string;
  target: SafariWebBundleTarget;
  /** When true, skip when entry mtime is older than popup.js. */
  skipIfUnchanged?: boolean;
}

function normalizeEntryFile(entry: string): string {
  return entry.replace(/^\.\//, '');
}

function resolvePopupJsPath(opts: ExportSafariWebBundleOptions): string {
  return Paths.getSafariPopupJsPath({
    platformProjectRoot: opts.platformProjectRoot,
    projectName: opts.projectName,
    productName: opts.target.productName,
  });
}

function shouldSkipForMtime(entryPath: string, popupPath: string): boolean {
  if (!(fs.existsSync(entryPath) && fs.existsSync(popupPath))) {
    return false;
  }
  const entryMtime = fs.statSync(entryPath).mtimeMs;
  const popupMtime = fs.statSync(popupPath).mtimeMs;
  return entryMtime <= popupMtime;
}

function findExportedBundle(outputDir: string): string | undefined {
  const direct = path.join(outputDir, 'bundle.js');
  if (fs.existsSync(direct)) {
    return direct;
  }

  const entries = fs.readdirSync(outputDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.js')) {
      return path.join(outputDir, entry.name);
    }
  }
}

function runExpoWebExport(
  projectRoot: string,
  entryFile: string,
  outputDir: string
): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const bundleOutput = path.join(outputDir, 'bundle.js');
  const entryPath = path.resolve(projectRoot, entryFile);

  const embed = spawnSync(
    'npx',
    [
      'expo',
      'export:embed',
      '--platform',
      'web',
      '--entry-file',
      entryPath,
      '--bundle-output',
      bundleOutput,
      '--dev',
      'false',
    ],
    { cwd: projectRoot, stdio: 'inherit', env: process.env }
  );

  if (embed.status === 0 && fs.existsSync(bundleOutput)) {
    return bundleOutput;
  }

  const exportDir = path.join(outputDir, 'web-export');
  const webExport = spawnSync(
    'npx',
    ['expo', 'export', '--platform', 'web', '--output-dir', exportDir],
    { cwd: projectRoot, stdio: 'inherit', env: process.env }
  );

  if (webExport.status !== 0) {
    throw new Error(
      `Safari web export failed (embed: ${embed.status ?? 'null'}, export: ${webExport.status ?? 'null'})`
    );
  }

  const bundle = findExportedBundle(exportDir);
  if (!bundle) {
    throw new Error(
      `Safari web export completed but no JS bundle found in ${exportDir}`
    );
  }
  return bundle;
}

function copyBundleToPopup(bundlePath: string, popupPath: string): void {
  fs.mkdirSync(path.dirname(popupPath), { recursive: true });
  fs.copyFileSync(bundlePath, popupPath);
}

/**
 * Export a Safari target's RN Web entry and copy the bundle to sealed `popup.js`.
 */
export function exportSafariWebBundle(options: ExportSafariWebBundleOptions): {
  skipped: boolean;
  popupJsPath: string;
} {
  if (process.env.SKIP_SAFARI_EXPORT === '1') {
    return { skipped: true, popupJsPath: resolvePopupJsPath(options) };
  }

  const entryFile = normalizeEntryFile(options.target.entryFile);
  const entryPath = path.resolve(options.projectRoot, entryFile);
  const popupJsPath = resolvePopupJsPath(options);

  if (
    options.skipIfUnchanged !== false &&
    shouldSkipForMtime(entryPath, popupJsPath)
  ) {
    return { skipped: true, popupJsPath };
  }

  const outputDir = path.join(
    options.platformProjectRoot,
    'build',
    'safari-resources',
    options.target.productName
  );
  const bundlePath = runExpoWebExport(
    options.projectRoot,
    entryFile,
    outputDir
  );
  copyBundleToPopup(bundlePath, popupJsPath);
  return { skipped: false, popupJsPath };
}
