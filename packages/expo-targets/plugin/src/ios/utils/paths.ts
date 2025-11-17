import path from 'path';

/**
 * Path utilities for working with target directories and files.
 * Centralizes path resolution logic used across iOS plugins.
 */

/**
 * Sanitize target name for use in Xcode (removes non-alphanumeric characters).
 * Appends "Target" suffix to avoid conflicts with main app name.
 */
export function sanitizeTargetName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '') + 'Target';
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
  const dirName = sanitizeTargetName(targetName);
  // Note: sanitizeTargetName already includes 'Target' suffix to prevent collision
  // with main app on case-insensitive filesystems (e.g., "ShareExtension" -> "ShareExtensionTarget")
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

/**
 * ============================================================================
 * NEW: Reference-in-Place Path Utilities
 * ============================================================================
 * The following functions return paths within targets/ directory where files
 * are referenced in place rather than copied to ios/. Generated files (Info.plist,
 * Assets.xcassets, entitlements) go in targets/TARGETNAME/ios/build/, while user Swift
 * files remain in targets/TARGETNAME/ios/.
 */

/**
 * Get build output directory in targets/ folder.
 * This is where generated files (Info.plist, Assets, entitlements) are placed.
 */
export function getTargetBuildPath({
  projectRoot,
  targetDirectory,
}: {
  projectRoot: string;
  targetDirectory: string;
}): string {
  return path.join(projectRoot, targetDirectory, 'ios', 'build');
}

/**
 * Get path to Info.plist in targets/TARGETNAME/ios/build/.
 * New approach: Info.plist generated in targets/, referenced from Xcode.
 */
export function getTargetInfoPlistPath({
  projectRoot,
  targetDirectory,
}: {
  projectRoot: string;
  targetDirectory: string;
}): string {
  return path.join(
    getTargetBuildPath({ projectRoot, targetDirectory }),
    'Info.plist'
  );
}

/**
 * Get path to entitlements file in targets/TARGETNAME/ios/build/.
 * New approach: Entitlements generated in targets/, referenced from Xcode.
 */
export function getTargetEntitlementsPath({
  projectRoot,
  targetDirectory,
}: {
  projectRoot: string;
  targetDirectory: string;
}): string {
  return path.join(
    getTargetBuildPath({ projectRoot, targetDirectory }),
    'generated.entitlements'
  );
}

/**
 * Get path to Assets.xcassets in targets/TARGETNAME/ios/build/.
 * New approach: Assets generated/copied to targets/, referenced from Xcode.
 * For sticker targets, returns Stickers.xcassets instead.
 */
export function getTargetAssetsPath({
  projectRoot,
  targetDirectory,
  isStickers,
}: {
  projectRoot: string;
  targetDirectory: string;
  isStickers?: boolean;
}): string {
  const assetsFolderName = isStickers ? 'Stickers.xcassets' : 'Assets.xcassets';
  return path.join(
    getTargetBuildPath({ projectRoot, targetDirectory }),
    assetsFolderName
  );
}

/**
 * Get path to a specific colorset in targets/TARGETNAME/ios/build/Assets.xcassets/.
 */
export function getTargetColorsetPath({
  projectRoot,
  targetDirectory,
  colorName,
}: {
  projectRoot: string;
  targetDirectory: string;
  colorName: string;
}): string {
  return path.join(
    getTargetAssetsPath({ projectRoot, targetDirectory }),
    `${colorName}.colorset`
  );
}

/**
 * Get path to user's Swift source files in targets/TARGETNAME/ios/.
 * These are referenced in place, not copied.
 */
export function getTargetSourcePath({
  projectRoot,
  targetDirectory,
  fileName,
}: {
  projectRoot: string;
  targetDirectory: string;
  fileName: string;
}): string {
  return path.join(projectRoot, targetDirectory, 'ios', fileName);
}
