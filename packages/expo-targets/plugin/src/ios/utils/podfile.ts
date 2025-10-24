/**
 * Podfile manipulation utilities.
 * Provides helpers for injecting target blocks into Podfile.
 */

/**
 * Generate a Podfile target block for a React Native extension.
 */
export function generateReactNativeTargetBlock({
  targetName,
  deploymentTarget,
}: {
  targetName: string;
  deploymentTarget: string;
}): string {
  return `
target '${targetName}' do
  platform :ios, '${deploymentTarget}'
  use_frameworks! :linkage => :static

  config = use_native_modules!
  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )
end
`;
}

/**
 * Generate a Podfile target block for a standalone (non-RN) extension.
 */
export function generateStandaloneTargetBlock({
  targetName,
  deploymentTarget,
}: {
  targetName: string;
  deploymentTarget: string;
}): string {
  return `
target '${targetName}' do
  platform :ios, '${deploymentTarget}'
  use_frameworks! :linkage => :static
end
`;
}

/**
 * Insert a target block into a Podfile.
 * Prefers inserting before post_install, otherwise before the last 'end'.
 */
export function insertTargetBlock(
  podfileContent: string,
  targetBlock: string
): string {
  const postInstallIndex = podfileContent.indexOf('post_install do');

  if (postInstallIndex === -1) {
    // Fallback: insert before the last 'end'
    const lastEndIndex = podfileContent.lastIndexOf('end');
    return (
      podfileContent.slice(0, lastEndIndex) +
      targetBlock +
      podfileContent.slice(lastEndIndex)
    );
  }

  // Insert before post_install, inside main target
  return (
    podfileContent.slice(0, postInstallIndex) +
    targetBlock +
    '\n  ' +
    podfileContent.slice(postInstallIndex)
  );
}

/**
 * Check if a Podfile already contains a target block.
 */
export function hasTargetBlock(
  podfileContent: string,
  targetName: string
): boolean {
  return podfileContent.includes(`target '${targetName}'`);
}
