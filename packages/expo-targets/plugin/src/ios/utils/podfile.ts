/**
 * Podfile manipulation utilities.
 * Provides helpers for injecting target blocks into Podfile.
 */

/**
 * Generate a Podfile target block for a React Native extension.
 * Extension targets only inherit search paths, with no explicit pod dependencies.
 * This avoids linking incompatible modules like Expo that contain UIApplication APIs.
 *
 * Note: ExpoTargetsMessages is accessed via the main app's autolinking through shared
 * registry defined in generated code, so no direct pod dependency is needed.
 */
export function generateReactNativeTargetBlock({
  targetName,
  deploymentTarget,
  extensionType,
}: {
  targetName: string;
  deploymentTarget: string;
  extensionType: string;
}): string {
  return `
  target '${targetName}' do
    platform :ios, '${deploymentTarget}'
    inherit! :search_paths
  end
`;
}

/**
 * Check if main app target uses frameworks.
 * Returns true if use_frameworks! is found in the main target block.
 */
export function mainTargetUsesFrameworks(
  podfileContent: string,
  mainTargetName: string
): boolean {
  const targetRegex = new RegExp(
    `target\\s+'${mainTargetName}'\\s+do([\\s\\S]*?)(?=\\n\\s*target\\s+|post_install|$)`,
    'm'
  );

  const match = podfileContent.match(targetRegex);
  if (!match) {
    return false;
  }

  const targetBlock = match[1];
  return targetBlock.includes('use_frameworks!');
}

/**
 * Generate a Podfile target block for a standalone (non-RN) extension.
 * Standalone targets use native code only (Swift/Obj-C), no React Native or Expo modules.
 * Must match main app's use_frameworks! setting for CocoaPods integration.
 */
export function generateStandaloneTargetBlock({
  targetName,
  deploymentTarget,
  useFrameworks,
}: {
  targetName: string;
  deploymentTarget: string;
  useFrameworks?: boolean;
}): string {
  const frameworksLine = useFrameworks
    ? `    use_frameworks! :linkage => :static\n`
    : '';
  return `
  target '${targetName}' do
${frameworksLine}    platform :ios, '${deploymentTarget}'
  end
`;
}

/**
 * Insert a target block into a Podfile.
 * React Native targets are nested inside main app to inherit dependencies.
 * Standalone targets are inserted as siblings to avoid Expo module autolinking.
 */
export function insertTargetBlock(
  podfileContent: string,
  targetBlock: string,
  standalone: boolean = false,
  logger?: { log: (message: string) => void }
): string {
  if (standalone) {
    // Standalone targets: insert as sibling AFTER main target's closing 'end'
    // This prevents CocoaPods from auto-generating Expo module providers

    // Find the last 'end' in the Podfile - this should be the main target's closing 'end'
    // since the main target is the outermost block in a standard Expo Podfile
    const lastEndMatch = podfileContent.match(/\bend\b(?!.*\bend\b)/s);

    if (!lastEndMatch) {
      throw new Error('Could not find any end keyword in Podfile');
    }

    const mainTargetEndIndex = lastEndMatch.index! + lastEndMatch[0].length;

    if (logger) {
      logger.log(
        `Inserting standalone target after main target's closing 'end' at position ${mainTargetEndIndex}`
      );
    } else {
      console.log(
        `[expo-targets] Inserting standalone target after main target's closing 'end' at position ${mainTargetEndIndex}`
      );
    }

    // Insert after main target's closing 'end'
    return (
      podfileContent.slice(0, mainTargetEndIndex) +
      '\n\n' +
      targetBlock.trim() +
      podfileContent.slice(mainTargetEndIndex)
    );
  }

  if (logger) {
    logger.log('Inserting React Native target nested inside main target');
  } else {
    console.log(
      '[expo-targets] Inserting React Native target nested inside main target'
    );
  }

  // React Native targets: nest inside main target before post_install
  const postInstallIndex = podfileContent.indexOf('post_install do');

  if (postInstallIndex !== -1) {
    return (
      podfileContent.slice(0, postInstallIndex) +
      targetBlock +
      '\n  ' +
      podfileContent.slice(postInstallIndex)
    );
  }

  // Fallback: insert before the last 'end' of main target
  const lastEndIndex = podfileContent.lastIndexOf('end');
  return (
    podfileContent.slice(0, lastEndIndex) +
    targetBlock +
    '\n' +
    podfileContent.slice(lastEndIndex)
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

/**
 * Remove an existing target block from a Podfile.
 * Finds the target declaration and removes it along with its entire do/end block.
 */
export function removeTargetBlock(
  podfileContent: string,
  targetName: string
): string {
  // Find the target block
  const targetRegex = new RegExp(`target\\s+['"]${targetName}['"]\\s+do`, 'g');
  const targetMatch = targetRegex.exec(podfileContent);

  if (!targetMatch) {
    return podfileContent; // Target doesn't exist, nothing to remove
  }

  // Find the corresponding closing 'end' by counting nested block pairs
  const startIndex = targetMatch.index;
  const afterDoIndex = targetMatch.index + targetMatch[0].length;
  // Start at depth 1 because we're already inside the target block (after 'do')
  let depth = 1;

  // Match all Ruby block keywords that require 'end'
  const blockRegex = /\b(do|if|unless|case|begin|class|module|def|end)\b/g;
  blockRegex.lastIndex = afterDoIndex;

  let match;
  let targetEndIndex = -1;

  while ((match = blockRegex.exec(podfileContent)) !== null) {
    if (match[1] === 'end') {
      depth--;
      if (depth === 0) {
        // Found the matching 'end' for target
        targetEndIndex = match.index + match[0].length;
        break;
      }
    } else {
      // All other keywords open a block
      depth++;
    }
  }

  if (targetEndIndex === -1) {
    throw new Error(`Could not find closing end for target '${targetName}'`);
  }

  // Remove the target block including surrounding whitespace
  // Look back to remove leading whitespace/newlines
  let removeStart = startIndex;
  while (removeStart > 0 && /[\s\n]/.test(podfileContent[removeStart - 1])) {
    removeStart--;
  }

  // Look forward to remove trailing newlines (but keep one newline if present)
  let removeEnd = targetEndIndex;
  while (
    removeEnd < podfileContent.length &&
    podfileContent[removeEnd] === '\n'
  ) {
    removeEnd++;
    break; // Keep only one trailing newline
  }

  return podfileContent.slice(0, removeStart) + podfileContent.slice(removeEnd);
}

/**
 * Ensure main app target has use_frameworks! to match extension requirements.
 * CocoaPods requires host app and extensions to have matching use_frameworks! settings.
 */
export function ensureMainTargetUsesFrameworks(
  podfileContent: string,
  mainTargetName: string
): string {
  // Check if main target already has use_frameworks!
  const targetRegex = new RegExp(
    `target\\s+'${mainTargetName}'\\s+do([\\s\\S]*?)(?=\\n\\s*target\\s+|post_install|$)`,
    'm'
  );

  const match = podfileContent.match(targetRegex);
  if (!match) {
    return podfileContent;
  }

  const targetBlock = match[1];

  // Check if use_frameworks! already exists in this target
  if (targetBlock.includes('use_frameworks!')) {
    return podfileContent;
  }

  // Find insertion point: after "target 'Name' do" line
  const targetLineRegex = new RegExp(
    `(target\\s+'${mainTargetName}'\\s+do\\s*\\n)`,
    'm'
  );

  return podfileContent.replace(
    targetLineRegex,
    `$1  use_frameworks! :linkage => :static\n\n`
  );
}

/**
 * Update the Podfile platform line to match the highest deployment target.
 * This ensures consistency between the main app platform and extension targets.
 *
 * Fixes deployment target mismatch where Podfile defaults to 15.1 but extension
 * targets require a higher version (e.g., 17.0), causing linker errors.
 */
export function updatePodfilePlatform(
  podfileContent: string,
  deploymentTarget: string
): string {
  // Match platform line with various formats:
  // - platform :ios, '15.1'
  // - platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'
  // - platform :ios, "15.1"
  const platformLineRegex =
    /(platform\s+:ios\s*,\s*)(?:podfile_properties\[['"]ios\.deploymentTarget['"]\]\s*\|\|\s*)?(['"])([^'"]+)(['"])/;
  const match = podfileContent.match(platformLineRegex);

  if (!match) {
    console.warn(
      '[expo-targets] Could not find platform :ios line in Podfile to update'
    );
    return podfileContent;
  }

  const currentVersion = match[3];
  const quoteChar = match[2]; // Preserve original quote style (' or ")
  const currentVersionNum = parseFloat(currentVersion);
  const newVersionNum = parseFloat(deploymentTarget);

  // Only update if the new version is higher
  if (newVersionNum > currentVersionNum) {
    console.log(
      `[expo-targets] Updating Podfile platform from iOS ${currentVersion} to ${deploymentTarget}`
    );
    // Replace the entire platform line with a simple version
    // Use the same quote style as the original
    return podfileContent.replace(
      platformLineRegex,
      `$1${quoteChar}${deploymentTarget}${quoteChar}`
    );
  }

  return podfileContent;
}

/**
 * Inject deployment target fixes into the main app's existing post_install hook.
 * This ensures extension targets maintain their correct deployment targets even after
 * react_native_post_install runs, which might override them.
 *
 * Fixes both the Pods Xcode project targets AND the xcconfig files that extensions reference.
 */
export function ensureExtensionDeploymentTargets(
  podfileContent: string,
  extensions: { targetName: string; deploymentTarget: string }[]
): string {
  if (extensions.length === 0) {
    return podfileContent;
  }

  // Remove any existing deployment target fix code
  if (
    podfileContent.includes('# [expo-targets] Fix extension deployment targets')
  ) {
    const fixRegex =
      /\s*# \[expo-targets\] Fix extension deployment targets[\s\S]*?(?=\n\s{4}\w|\n\s{2}end)/;
    podfileContent = podfileContent.replace(fixRegex, '');
  }

  // Generate the deployment target fix code to inject
  const fixCode = `
    # [expo-targets] Fix extension deployment targets
    installer.pods_project.targets.each do |target|
${extensions
  .map(
    (ext) => `      if target.name.include?('${ext.targetName}')
        target.build_configurations.each do |config|
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${ext.deploymentTarget}'
          # Also update the xcconfig file
          xcconfig_path = config.base_configuration_reference.real_path
          if xcconfig_path && File.exist?(xcconfig_path)
            xcconfig_content = File.read(xcconfig_path)
            # Remove existing IPHONEOS_DEPLOYMENT_TARGET if present
            xcconfig_content.gsub!(/^IPHONEOS_DEPLOYMENT_TARGET = .*$/, '')
            # Add deployment target
            xcconfig_content += "\\nIPHONEOS_DEPLOYMENT_TARGET = ${ext.deploymentTarget}\\n"
            File.write(xcconfig_path, xcconfig_content)
          end
        end
      end`
  )
  .join('\n')}
    end
`;

  // Find the main app's post_install hook and inject our code before the closing 'end'
  // Look for: post_install do |installer| ... react_native_post_install(...) ... end
  const postInstallRegex =
    /(post_install do \|installer\|[\s\S]*?react_native_post_install\([\s\S]*?\)[\s\S]*?)(\n\s{2}end)/;

  const match = podfileContent.match(postInstallRegex);
  if (match) {
    // Inject our code before the closing 'end' of post_install
    return podfileContent.replace(postInstallRegex, `$1${fixCode}$2`);
  }

  // Fallback: couldn't find the post_install hook, skip modification
  console.warn(
    '[expo-targets] Could not find post_install hook to inject deployment target fixes'
  );
  return podfileContent;
}

/**
 * Ensure React Native extension targets have proper framework search paths.
 * Uses START/END markers for reliable, idempotent injection.
 */
export function ensureReactNativeExtensionFrameworkPaths(
  podfileContent: string,
  extensions: { targetName: string; deploymentTarget: string }[],
  mainTargetName: string
): string {
  if (extensions.length === 0) {
    return podfileContent;
  }

  const START_MARKER = '    # [expo-targets-start]';
  const END_MARKER = '    # [expo-targets-end]';

  // Remove any existing block between markers (idempotent)
  const startIndex = podfileContent.indexOf(START_MARKER);
  if (startIndex !== -1) {
    const endIndex = podfileContent.indexOf(END_MARKER, startIndex);
    if (endIndex !== -1) {
      const beforeBlock = podfileContent.substring(0, startIndex);
      const afterBlock = podfileContent.substring(endIndex + END_MARKER.length);
      podfileContent = beforeBlock.trimEnd() + '\n' + afterBlock.trimStart();
    }
  }

  // Generate fresh code with markers
  const mainPodsTarget = `Pods-${mainTargetName}`;
  const fixCode = `${START_MARKER}
    # Fix React Native extension framework search paths
    installer.pods_project.targets.each do |target|
${extensions
  .map(
    (ext) => `      if target.name.include?('${ext.targetName}')
        target.build_configurations.each do |config|
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${ext.deploymentTarget}'
          # Copy framework search paths from main app target
          main_target = installer.pods_project.targets.find { |t| t.name == '${mainPodsTarget}' }
          if main_target
            main_config = main_target.build_configurations.find { |c| c.name == config.name }
            if main_config && main_config.build_settings['FRAMEWORK_SEARCH_PATHS']
              existing_paths = config.build_settings['FRAMEWORK_SEARCH_PATHS'] || ['$(inherited)']
              inherited_paths = main_config.build_settings['FRAMEWORK_SEARCH_PATHS']
              # Merge inherited paths, avoiding duplicates
              merged_paths = existing_paths + inherited_paths.reject { |p| existing_paths.include?(p) }
              config.build_settings['FRAMEWORK_SEARCH_PATHS'] = merged_paths
            end
          end
          # Update the xcconfig file with framework search paths and deployment target
          xcconfig_path = config.base_configuration_reference.real_path
          if xcconfig_path && File.exist?(xcconfig_path)
            xcconfig_content = File.read(xcconfig_path)
            # Remove existing IPHONEOS_DEPLOYMENT_TARGET if present
            xcconfig_content.gsub!(/^IPHONEOS_DEPLOYMENT_TARGET = .*$/, '')
            # Add deployment target
            xcconfig_content += "\\nIPHONEOS_DEPLOYMENT_TARGET = ${ext.deploymentTarget}\\n"
            # Copy framework search paths and other Swift-related settings from main app's xcconfig
            if main_target
              main_config = main_target.build_configurations.find { |c| c.name == config.name }
              if main_config
                main_xcconfig_path = main_config.base_configuration_reference.real_path
                if main_xcconfig_path && File.exist?(main_xcconfig_path)
                  main_xcconfig_content = File.read(main_xcconfig_path)
                  # Copy FRAMEWORK_SEARCH_PATHS (needed for Swift imports)
                  framework_paths_match = main_xcconfig_content.match(/^FRAMEWORK_SEARCH_PATHS = (.+)$/m)
                  if framework_paths_match
                    xcconfig_content.gsub!(/^FRAMEWORK_SEARCH_PATHS = .*$/, '')
                    xcconfig_content += "\\nFRAMEWORK_SEARCH_PATHS = #{framework_paths_match[1]}\\n"
                  end
                  # Copy HEADER_SEARCH_PATHS (includes ExpoModulesCore headers)
                  header_paths_match = main_xcconfig_content.match(/^HEADER_SEARCH_PATHS = (.+)$/m)
                  if header_paths_match
                    xcconfig_content.gsub!(/^HEADER_SEARCH_PATHS = .*$/, '')
                    xcconfig_content += "\\nHEADER_SEARCH_PATHS = #{header_paths_match[1]}\\n"
                  end
                  # Copy OTHER_SWIFT_FLAGS (includes module map files for ExpoModulesCore)
                  swift_flags_match = main_xcconfig_content.match(/^OTHER_SWIFT_FLAGS = (.+)$/m)
                  if swift_flags_match
                    xcconfig_content.gsub!(/^OTHER_SWIFT_FLAGS = .*$/, '')
                    xcconfig_content += "\\nOTHER_SWIFT_FLAGS = #{swift_flags_match[1]}\\n"
                  end
                  # Copy SWIFT_INCLUDE_PATHS (Swift module search paths)
                  swift_include_match = main_xcconfig_content.match(/^SWIFT_INCLUDE_PATHS = (.+)$/m)
                  if swift_include_match
                    xcconfig_content.gsub!(/^SWIFT_INCLUDE_PATHS = .*$/, '')
                    xcconfig_content += "\\nSWIFT_INCLUDE_PATHS = #{swift_include_match[1]}\\n"
                  end
                end
              end
            end
            File.write(xcconfig_path, xcconfig_content)
          end
        end
      end`
  )
  .join('\n')}
    end
${END_MARKER}`;

  // Find where to inject (after react_native_post_install closing paren)
  // Use line-by-line approach to find the closing paren properly
  const lines = podfileContent.split('\n');
  let reactNativeStartLine = -1;
  let reactNativeEndLine = -1;
  let parenDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('react_native_post_install(')) {
      reactNativeStartLine = i;
      parenDepth =
        (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
      continue;
    }
    if (reactNativeStartLine !== -1) {
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      parenDepth += openParens - closeParens;
      if (parenDepth === 0 && closeParens > 0) {
        reactNativeEndLine = i;
        break;
      }
    }
  }

  if (reactNativeStartLine === -1 || reactNativeEndLine === -1) {
    console.warn('[expo-targets] Could not find react_native_post_install');
    return podfileContent;
  }

  // Find the position after the closing paren
  const beforeLines = lines.slice(0, reactNativeEndLine + 1).join('\n');
  const insertPosition = beforeLines.length;
  const beforeInsert = podfileContent.substring(0, insertPosition);
  const afterInsert = podfileContent.substring(insertPosition);

  // Insert our code with proper newlines
  // Ensure newline before our code
  const needsNewlineBefore = !beforeInsert.endsWith('\n');

  // Check what comes after - preserve any existing closing 'end' for post_install
  const afterTrimmed = afterInsert.trimStart();
  const hasPostInstallEnd = afterTrimmed.startsWith('end');

  // Insert: newline + our code + newline (preserve existing post_install end if present)
  return (
    beforeInsert.trimEnd() +
    (needsNewlineBefore ? '\n' : '') +
    fixCode +
    '\n' +
    afterInsert.trimStart()
  );
}
