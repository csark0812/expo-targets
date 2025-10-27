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
 */
export function getAssetsXcassetsPath({
  platformProjectRoot,
  targetName,
}: {
  platformProjectRoot: string;
  targetName: string;
}): string {
  return path.join(
    getTargetGroupPath({ platformProjectRoot, targetName }),
    'Assets.xcassets'
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
