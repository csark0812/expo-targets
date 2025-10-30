import path from 'path';

/**
 * Path utilities for working with target directories and files.
 * Centralizes path resolution logic used across iOS plugins.
 */

/**
 * Sanitize target name for use in Xcode (removes non-alphanumeric characters).
 */
export function sanitizeTargetName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Get the target directory path (where user places their target code).
 */
export function getTargetDirectory({
  projectRoot,
  targetDirectory,
}: {
  projectRoot: string;
  targetDirectory: string;
}): string {
  return path.join(projectRoot, targetDirectory, 'ios');
}

/**
 * Get the target group path in Xcode project (where target files live).
 * Adds 'Target' suffix to prevent case-insensitivity collisions with main app on macOS.
 *
 * On case-insensitive filesystems (macOS default), directory names that differ only by case
 * collide. For example, "shareextension" (main app) and "ShareExtension" (target) would resolve
 * to the same directory. Adding "Target" suffix ensures uniqueness.
 */
export function getTargetGroupPath({
  platformProjectRoot,
  targetName,
}: {
  platformProjectRoot: string;
  targetName: string;
}): string {
  const sanitized = sanitizeTargetName(targetName);
  // Add 'Target' suffix to prevent collision with main app on case-insensitive filesystems
  // e.g., "ShareExtension" -> "ShareExtensionTarget" to avoid collision with "shareextension"
  // This ensures files are placed in separate directories even on case-insensitive filesystems
  const dirName = `${sanitized}Target`;
  return path.join(platformProjectRoot, dirName);
}

/**
 * Get path to generated entitlements file in Xcode project.
 */
export function getGeneratedEntitlementsPath({
  platformProjectRoot,
  targetName,
}: {
  platformProjectRoot: string;
  targetName: string;
}): string {
  return path.join(
    getTargetGroupPath({ platformProjectRoot, targetName }),
    'generated.entitlements'
  );
}

/**
 * Get path to Info.plist in Xcode project.
 */
export function getInfoPlistPath({
  platformProjectRoot,
  targetName,
}: {
  platformProjectRoot: string;
  targetName: string;
}): string {
  return path.join(
    getTargetGroupPath({ platformProjectRoot, targetName }),
    'Info.plist'
  );
}

/**
 * Get path to Assets.xcassets in Xcode project.
 * For sticker targets, returns Stickers.xcassets instead.
 */
export function getAssetsXcassetsPath({
  platformProjectRoot,
  targetName,
  isStickers,
}: {
  platformProjectRoot: string;
  targetName: string;
  isStickers?: boolean;
}): string {
  const assetsFolderName = isStickers ? 'Stickers.xcassets' : 'Assets.xcassets';
  return path.join(
    getTargetGroupPath({ platformProjectRoot, targetName }),
    assetsFolderName
  );
}

/**
 * Get path to a specific colorset in Xcode project.
 */
export function getColorsetPath({
  platformProjectRoot,
  targetName,
  colorName,
}: {
  platformProjectRoot: string;
  targetName: string;
  colorName: string;
}): string {
  return path.join(
    getAssetsXcassetsPath({ platformProjectRoot, targetName }),
    `${colorName}.colorset`
  );
}

/**
 * Get path to a specific sticker pack in Xcode project.
 */
export function getStickerPackPath({
  platformProjectRoot,
  targetName,
  stickerPackName,
}: {
  platformProjectRoot: string;
  targetName: string;
  stickerPackName: string;
}): string {
  return path.join(
    getAssetsXcassetsPath({
      platformProjectRoot,
      targetName,
      isStickers: true,
    }),
    `${stickerPackName}.stickerpack`
  );
}
