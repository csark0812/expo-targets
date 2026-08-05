import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';

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
 * Export extension bundles into dist/expo-targets/bundles for eas update assets.
 */
export function runExportExtensionBundles(opts: {
  projectRoot?: string;
  distRoot?: string;
  bundleFiles?: Record<string, string>;
  allowPlaceholder?: boolean;
}): { code: number; written: string[] } {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const distRoot = opts.distRoot ?? path.join(projectRoot, 'dist');
  const ctx = loadProject(projectRoot);
  const runtimeVersion = resolveRuntimeVersion(ctx.expo);
  const written: string[] = [];

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
    } else {
      console.warn(
        `[expo-targets] skip ${targetName}: no prebuilt bundle (pass --bundle or Hermes export)`
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
    console.log(`[expo-targets] exported ${bundlePath}`);
  }

  return { code: 0, written };
}
