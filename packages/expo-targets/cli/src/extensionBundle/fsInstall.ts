import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  type ExtensionBundleManifest,
  type PublishSidecar,
  maxBytesForType,
  publishBundleRelPath,
  publishManifestRelPath,
} from './constants';

export function sha256File(filePath: string): string {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

export function sha256Buffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Install a local jsbundle into an App Group–style root directory
 * (`{appGroupRoot}/expo-targets/bundles/{targetName}/`).
 * Used by Node smokes and as the algorithm for the native install path.
 */
export function installExtensionBundleToRoot(opts: {
  appGroupRoot: string;
  targetName: string;
  type: string;
  runtimeVersion: string;
  sourcePath: string;
}): ExtensionBundleManifest {
  const { appGroupRoot, targetName, type, runtimeVersion, sourcePath } = opts;
  if (!runtimeVersion) {
    throw new Error(
      'runtimeVersion is required to install an extension bundle (fail closed)'
    );
  }
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Extension bundle not found: ${sourcePath}`);
  }

  const maxBytes = maxBytesForType(type);
  const stat = fs.statSync(sourcePath);
  if (stat.size > maxBytes) {
    throw new Error(
      `Extension bundle for "${targetName}" is ${stat.size} bytes; max for type "${type}" is ${maxBytes}`
    );
  }

  const sha256 = sha256File(sourcePath);
  const destDir = path.join(
    appGroupRoot,
    'expo-targets',
    'bundles',
    targetName
  );
  const tmpDir = `${destDir}.tmp-${process.pid}`;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const destBundle = path.join(tmpDir, 'main.jsbundle');
  fs.copyFileSync(sourcePath, destBundle);

  const manifest: ExtensionBundleManifest = {
    byteLength: stat.size,
    sha256,
    installedAt: new Date().toISOString(),
    runtimeVersion,
    targetName,
    type,
  };
  fs.writeFileSync(
    path.join(tmpDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.renameSync(tmpDir, destDir);

  return manifest;
}

export function clearExtensionBundleFromRoot(
  appGroupRoot: string,
  targetName: string
): void {
  const destDir = path.join(
    appGroupRoot,
    'expo-targets',
    'bundles',
    targetName
  );
  fs.rmSync(destDir, { recursive: true, force: true });
}

export function getExtensionBundleInfoFromRoot(
  appGroupRoot: string,
  targetName: string
): ExtensionBundleManifest | null {
  const manifestPath = path.join(
    appGroupRoot,
    'expo-targets',
    'bundles',
    targetName,
    'manifest.json'
  );
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(
    fs.readFileSync(manifestPath, 'utf8')
  ) as ExtensionBundleManifest;
}

/** Validate an installed bundle against baked runtimeVersion + size cap. */
export function isInstalledBundleValid(opts: {
  appGroupRoot: string;
  targetName: string;
  bakedRuntimeVersion: string;
}): boolean {
  const { appGroupRoot, targetName, bakedRuntimeVersion } = opts;
  if (!bakedRuntimeVersion) {
    return false;
  }
  const info = getExtensionBundleInfoFromRoot(appGroupRoot, targetName);
  if (!info) {
    return false;
  }
  if (info.runtimeVersion !== bakedRuntimeVersion) {
    return false;
  }
  try {
    maxBytesForType(info.type);
  } catch {
    return false;
  }
  if (info.byteLength > maxBytesForType(info.type)) {
    return false;
  }
  const bundlePath = path.join(
    appGroupRoot,
    'expo-targets',
    'bundles',
    targetName,
    'main.jsbundle'
  );
  if (!fs.existsSync(bundlePath)) {
    return false;
  }
  return sha256File(bundlePath) === info.sha256;
}

/**
 * After an update lands under `updateAssetRoot` (containing expo-targets/bundles/…),
 * sync each sidecar into the App Group root.
 */
export function syncExtensionBundlesFromUpdateAssets(opts: {
  updateAssetRoot: string;
  appGroupRoot: string;
  targets: Array<{ targetName: string; type: string; runtimeVersion: string }>;
}): ExtensionBundleManifest[] {
  const installed: ExtensionBundleManifest[] = [];
  for (const t of opts.targets) {
    const sourcePath = path.join(
      opts.updateAssetRoot,
      publishBundleRelPath(t.targetName)
    );
    const sidecarPath = path.join(
      opts.updateAssetRoot,
      publishManifestRelPath(t.targetName)
    );
    if (!fs.existsSync(sourcePath)) {
      continue;
    }
    let runtimeVersion = t.runtimeVersion;
    if (fs.existsSync(sidecarPath)) {
      const sidecar = JSON.parse(
        fs.readFileSync(sidecarPath, 'utf8')
      ) as PublishSidecar;
      if (sidecar.runtimeVersion) {
        runtimeVersion = sidecar.runtimeVersion;
      }
    }
    installed.push(
      installExtensionBundleToRoot({
        appGroupRoot: opts.appGroupRoot,
        targetName: t.targetName,
        type: t.type,
        runtimeVersion,
        sourcePath,
      })
    );
  }
  return installed;
}

/** Write a publish-layout bundle + sidecar under distRoot (export helper). */
export function writePublishLayout(opts: {
  distRoot: string;
  targetName: string;
  type: string;
  runtimeVersion: string;
  bundleBytes: Buffer;
}): { bundlePath: string; manifestPath: string } {
  const maxBytes = maxBytesForType(opts.type);
  if (opts.bundleBytes.byteLength > maxBytes) {
    throw new Error(
      `Export for "${opts.targetName}" is ${opts.bundleBytes.byteLength} bytes; max for "${opts.type}" is ${maxBytes}`
    );
  }
  if (!opts.runtimeVersion) {
    throw new Error(
      `runtimeVersion required to export extension bundle "${opts.targetName}"`
    );
  }
  const dir = path.join(
    opts.distRoot,
    'expo-targets',
    'bundles',
    opts.targetName
  );
  fs.mkdirSync(dir, { recursive: true });
  const bundlePath = path.join(dir, 'main.jsbundle');
  fs.writeFileSync(bundlePath, opts.bundleBytes);
  const sidecar: PublishSidecar = {
    runtimeVersion: opts.runtimeVersion,
    targetName: opts.targetName,
    type: opts.type,
  };
  const manifestPath = path.join(dir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(sidecar, null, 2));
  return { bundlePath, manifestPath };
}
