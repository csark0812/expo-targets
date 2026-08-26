import fs from 'node:fs';
import path from 'node:path';

import { sanitizeWidgetResourceName } from './resolveAndroidWidgetProviders';

const RASTER_EXTS = new Set(['.png', '.webp', '.jpg', '.jpeg', '.gif']);
const VECTOR_EXTS = new Set(['.xml']);

export function generateImageResources({
  projectRoot,
  targetDirectory,
  targetName,
  images,
}: {
  projectRoot: string;
  targetDirectory: string;
  targetName: string;
  images: Record<string, string>;
}): void {
  const prefix = sanitizeWidgetResourceName(targetName);
  const resDir = path.join(projectRoot, targetDirectory, 'android/res');

  for (const [name, assetPath] of Object.entries(images)) {
    const sourcePath = path.isAbsolute(assetPath)
      ? assetPath
      : path.join(projectRoot, targetDirectory, assetPath);
    copyImageAsset({
      sourcePath,
      resDir,
      resourceName: `${prefix}_${sanitizeWidgetResourceName(name)}`,
    });
  }
}

function scaleSibling(sourcePath: string, scale: '2x' | '3x'): string {
  const ext = path.extname(sourcePath);
  const base = path.basename(sourcePath, ext);
  return path.join(path.dirname(sourcePath), `${base}@${scale}${ext}`);
}

function collectScaleFiles(sourcePath: string): {
  scale: '1x' | '2x' | '3x';
  sourcePath: string;
}[] {
  const files: { scale: '1x' | '2x' | '3x'; sourcePath: string }[] = [
    { scale: '1x', sourcePath },
  ];
  for (const scale of ['2x', '3x'] as const) {
    const sibling = scaleSibling(sourcePath, scale);
    if (fs.existsSync(sibling) && fs.statSync(sibling).isFile()) {
      files.push({ scale, sourcePath: sibling });
    }
  }
  return files;
}

function densityFolder(
  scale: '1x' | '2x' | '3x',
  hasDensitySiblings: boolean
): string {
  if (!hasDensitySiblings) {
    return 'drawable';
  }
  if (scale === '1x') {
    return 'drawable-mdpi';
  }
  if (scale === '2x') {
    return 'drawable-xhdpi';
  }
  return 'drawable-xxhdpi';
}

function copyImageAsset({
  sourcePath,
  resDir,
  resourceName,
}: {
  sourcePath: string;
  resDir: string;
  resourceName: string;
}): void {
  if (!(fs.existsSync(sourcePath) && fs.statSync(sourcePath).isFile())) {
    return;
  }

  const ext = path.extname(sourcePath).toLowerCase();
  if (VECTOR_EXTS.has(ext)) {
    const destDir = path.join(resDir, 'drawable');
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(sourcePath, path.join(destDir, `${resourceName}${ext}`));
    return;
  }

  if (!RASTER_EXTS.has(ext)) {
    return;
  }

  const files = collectScaleFiles(sourcePath);
  const hasDensitySiblings = files.length > 1;
  for (const file of files) {
    const destDir = path.join(
      resDir,
      densityFolder(file.scale, hasDensitySiblings)
    );
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(
      file.sourcePath,
      path.join(destDir, `${resourceName}${ext}`)
    );
  }
}
