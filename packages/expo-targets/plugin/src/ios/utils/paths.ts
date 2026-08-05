import path from 'node:path';

/**
 * Path utilities for working with target directories and files.
 * Centralizes path resolution logic used across iOS plugins.
 */

/**
 * Sanitize target name for use in Xcode (removes non-alphanumeric characters).
 * Appends "Target" suffix to avoid conflicts with main app name.
 */
export function sanitizeTargetName(name: string): string {
  return `${name.replace(/[^a-zA-Z0-9]/g, '')}Target`;
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
 * Sealed generated artifacts (CNG)
 * ============================================================================
 * User Swift stays in targets/<name>/ios/ (referenced in place). Plugin-generated
 * Info.plist, Assets, entitlements, and stub Swift live under
 * ios/<App>/ExpoTargetsGenerated/<ProductName>/ (gitignored, always rewrite).
 */

/** Shared with host Live Activity / App Shortcuts CNG. */
export const GENERATED_DIR_NAME = 'ExpoTargetsGenerated';

/**
 * Absolute path to the sealed build output for one Xcode product.
 * `productName` must already be `sanitizeTargetName(...)`.
 */
export function getTargetBuildPath({
  platformProjectRoot,
  projectName,
  productName,
}: {
  platformProjectRoot: string;
  projectName: string;
  productName: string;
}): string {
  return path.join(
    platformProjectRoot,
    projectName,
    GENERATED_DIR_NAME,
    productName
  );
}

/** Legacy path under targets/ — deleted on apply after migration. */
export function getLegacyTargetBuildPath({
  projectRoot,
  targetDirectory,
}: {
  projectRoot: string;
  targetDirectory: string;
}): string {
  return path.join(projectRoot, targetDirectory, 'ios', 'build');
}

/**
 * Get path to Info.plist in ios/<App>/ExpoTargetsGenerated/<Product>/.
 */
export function getTargetInfoPlistPath(
  options: Parameters<typeof getTargetBuildPath>[0]
): string {
  return path.join(getTargetBuildPath(options), 'Info.plist');
}

/**
 * Get path to entitlements in ios/<App>/ExpoTargetsGenerated/<Product>/.
 */
export function getTargetEntitlementsPath(
  options: Parameters<typeof getTargetBuildPath>[0]
): string {
  return path.join(getTargetBuildPath(options), 'generated.entitlements');
}

/**
 * Get path to Assets.xcassets in ios/<App>/ExpoTargetsGenerated/<Product>/.
 * For sticker targets, returns Stickers.xcassets instead.
 */
export function getTargetAssetsPath({
  isStickers,
  ...buildPathOptions
}: Parameters<typeof getTargetBuildPath>[0] & {
  isStickers?: boolean;
}): string {
  const assetsFolderName = isStickers ? 'Stickers.xcassets' : 'Assets.xcassets';
  return path.join(getTargetBuildPath(buildPathOptions), assetsFolderName);
}

/**
 * Get path to a colorset in ExpoTargetsGenerated/<Product>/Assets.xcassets/.
 */
export function getTargetColorsetPath({
  colorName,
  ...assetsOptions
}: Parameters<typeof getTargetAssetsPath>[0] & {
  colorName: string;
}): string {
  return path.join(getTargetAssetsPath(assetsOptions), `${colorName}.colorset`);
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
