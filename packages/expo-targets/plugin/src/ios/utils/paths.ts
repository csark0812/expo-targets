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
 * Get the target build directory path (where generated files go).
 */
export function getTargetBuildDirectory({
  projectRoot,
  targetDirectory,
}: {
  projectRoot: string;
  targetDirectory: string;
}): string {
  return path.join(projectRoot, targetDirectory, 'ios', 'build');
}

/**
 * Get the target group path in Xcode project (where files are copied to).
 */
export function getTargetGroupPath({
  platformProjectRoot,
  targetName,
}: {
  platformProjectRoot: string;
  targetName: string;
}): string {
  const sanitized = sanitizeTargetName(targetName);
  return path.join(platformProjectRoot, sanitized);
}

/**
 * Get path to generated entitlements file.
 */
export function getGeneratedEntitlementsPath({
  projectRoot,
  targetDirectory,
}: {
  projectRoot: string;
  targetDirectory: string;
}): string {
  return path.join(
    getTargetBuildDirectory({ projectRoot, targetDirectory }),
    'generated.entitlements'
  );
}

/**
 * Get path to Info.plist in build directory.
 */
export function getInfoPlistPath({
  projectRoot,
  targetDirectory,
}: {
  projectRoot: string;
  targetDirectory: string;
}): string {
  return path.join(
    getTargetBuildDirectory({ projectRoot, targetDirectory }),
    'Info.plist'
  );
}

/**
 * Get path to Assets.xcassets in build directory.
 */
export function getAssetsXcassetsPath({
  projectRoot,
  targetDirectory,
}: {
  projectRoot: string;
  targetDirectory: string;
}): string {
  return path.join(
    getTargetBuildDirectory({ projectRoot, targetDirectory }),
    'Assets.xcassets'
  );
}

/**
 * Get path to a specific colorset.
 */
export function getColorsetPath({
  projectRoot,
  targetDirectory,
  colorName,
}: {
  projectRoot: string;
  targetDirectory: string;
  colorName: string;
}): string {
  return path.join(
    getAssetsXcassetsPath({ projectRoot, targetDirectory }),
    `${colorName}.colorset`
  );
}
