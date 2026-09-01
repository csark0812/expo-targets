/**
 * Podfile manipulation utilities.
 * Provides helpers for injecting target blocks into Podfile.
 */

/**
 * Locate the line that closes `react_native_post_install(...)`, which is where
 * generated post_install code has to be injected. Returns -1 when the call is
 * not present.
 */
function findReactNativePostInstallEndLine(lines: string[]): number {
  let startLine = -1;
  let parenDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;

    if (line.includes('react_native_post_install(')) {
      startLine = i;
      parenDepth = openParens - closeParens;
      continue;
    }

    if (startLine === -1) {
      continue;
    }

    parenDepth += openParens - closeParens;
    if (parenDepth === 0 && closeParens > 0) {
      return i;
    }
  }

  return -1;
}

/**
 * Locate the line holding the `end` that closes `post_install do`.
 * Ruby closes many keywords with `end`, so all openers have to be counted.
 */
function findPostInstallEndLine(lines: string[]): number {
  const blockOpenRegex =
    /\b(do|if|unless|def|class|module|begin|case|while|until)\b/g;
  let startLine = -1;
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('post_install do')) {
      startLine = i;
      depth = 1;
      continue;
    }

    if (startLine === -1) {
      continue;
    }

    const openMatches = (line.match(blockOpenRegex) || []).length;
    const endMatches = (line.match(/\bend\b/g) || []).length;
    depth += openMatches - endMatches;

    if (depth === 0 && endMatches > 0) {
      return i;
    }
  }

  return -1;
}

/**
 * Drop a previously injected block so injection stays idempotent.
 */
function removeMarkedBlock(
  podfileContent: string,
  startMarker: string,
  endMarker: string
): string {
  const startIndex = podfileContent.indexOf(startMarker);
  if (startIndex === -1) {
    return podfileContent;
  }

  const endIndex = podfileContent.indexOf(endMarker, startIndex);
  if (endIndex === -1) {
    return podfileContent;
  }

  const beforeBlock = podfileContent.substring(0, startIndex);
  const afterBlock = podfileContent.substring(endIndex + endMarker.length);
  return `${beforeBlock.trimEnd()}\n${afterBlock.trimStart()}`;
}

const RESOURCE_BUNDLE_SIGNING_START =
  '    # [expo-targets-resource-bundle-signing-start]';
const RESOURCE_BUNDLE_SIGNING_END =
  '    # [expo-targets-resource-bundle-signing-end]';

/**
 * Ensure resource bundle targets have code signing disabled for Xcode 14+.
 * Starting from Xcode 14, resource bundles are signed by default, which requires
 * setting the development team for each resource bundle target. This fix disables
 * code signing for resource bundles to avoid build failures.
 *
 * Uses START/END markers for reliable, idempotent injection.
 */
export function ensureResourceBundleCodeSigning(
  podfileContent: string
): string {
  if (podfileContent.includes(RESOURCE_BUNDLE_SIGNING_START)) {
    return podfileContent;
  }

  const fixCode = `${RESOURCE_BUNDLE_SIGNING_START}
    # Fix Xcode 14+ code signing for resource bundles
    installer.pods_project.targets.each do |target|
      if target.respond_to?(:product_type) && target.product_type == "com.apple.product-type.bundle"
        target.build_configurations.each do |config|
          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
        end
      end
    end
${RESOURCE_BUNDLE_SIGNING_END}`;

  const lines = podfileContent.split('\n');
  const endLine = findReactNativePostInstallEndLine(lines);

  if (endLine === -1) {
    return podfileContent;
  }

  const beforeLines = lines.slice(0, endLine + 1).join('\n');
  const afterLines = lines.slice(endLine + 1).join('\n');

  return `${beforeLines}\n\n${fixCode}\n${afterLines}`;
}

/**
 * Indent pods.rb content to match target block indentation.
 */
function indentCustomPods(podsRbContent?: string): string {
  if (!podsRbContent) {
    return '';
  }

  const indented = podsRbContent
    .split('\n')
    .map((line) => (line.trim() ? `    ${line}` : ''))
    .join('\n');

  return `\n${indented}\n`;
}

/**
 * Parseable marker: packages to strip from this nested target's ExpoModulesProvider.
 * Must not be a prefix of the post_integrate fence markers, and those fences
 * must not contain a Ruby `\bend\b` (standalone insert used to splice there).
 */
export const EXCLUDED_PACKAGES_MARKER =
  '# [expo-targets-excluded-packages-list]';
export const EXCLUDED_LINKER_MARKER = '# [expo-targets-excluded-linker-list]';
const EXCLUDED_PACKAGES_POST_INTEGRATE_START =
  '# [expo-targets-excluded-packages-begin]';
const EXCLUDED_PACKAGES_POST_INTEGRATE_END =
  '# [expo-targets-excluded-packages-done]';

/**
 * Generate a Podfile target block for a React Native extension.
 * Extension targets only inherit search paths, with no explicit pod dependencies.
 * This avoids linking incompatible modules like Expo that contain UIApplication APIs.
 *
 * `excludedPackages` and `linkerTokens` are recorded as comment markers so a
 * `post_integrate` hook can strip those names from `expo-configure-project.sh`,
 * regenerate the provider, and drop unused `-l` / `-framework` / module maps
 * on `Pods-<target>`. Nested `use_expo_modules!(exclude:)` is a no-op.
 *
 * @param podsRbContent - Optional content from a pods.rb file in the target directory.
 *                        Allows custom CocoaPods configuration (e.g., Firebase, third-party SDKs).
 */
export function generateReactNativeTargetBlock({
  targetName,
  deploymentTarget,
  extensionType: _extensionType,
  podsRbContent,
  excludedPackages,
  linkerTokens,
}: {
  targetName: string;
  deploymentTarget: string;
  extensionType: string;
  podsRbContent?: string;
  excludedPackages?: string[];
  linkerTokens?: string[];
}): string {
  const customPods = indentCustomPods(podsRbContent);
  const packages = (excludedPackages ?? [])
    .map((p) => p.trim())
    .filter(Boolean);
  const tokens = (linkerTokens ?? []).map((p) => p.trim()).filter(Boolean);
  const excludeLine =
    packages.length > 0
      ? `\n    ${EXCLUDED_PACKAGES_MARKER} ${packages.join(',')}`
      : '';
  const linkerLine =
    tokens.length > 0
      ? `\n    ${EXCLUDED_LINKER_MARKER} ${tokens.join(',')}`
      : '';

  // App Clips still use search_paths here; framework embedding for the clip
  // product is handled by a dedicated PBX shell phase (inherit! :complete
  // breaks ExpoModulesCore resolution under nested targets).
  return `
  target '${targetName}' do
    platform :ios, '${deploymentTarget}'
    inherit! :search_paths${excludeLine}${linkerLine}${customPods}
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
    `target\\s+'${mainTargetName}'\\s+do([\\s\\S]*?)(?=post_install|\\ntarget\\s+|$)`
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
 *
 * @param podsRbContent - Optional content from a pods.rb file in the target directory.
 *                        Allows custom CocoaPods configuration (e.g., Firebase, third-party SDKs).
 */
export function generateStandaloneTargetBlock({
  targetName,
  deploymentTarget,
  useFrameworks,
  podsRbContent,
}: {
  targetName: string;
  deploymentTarget: string;
  useFrameworks?: boolean;
  podsRbContent?: string;
}): string {
  const frameworksLine = useFrameworks
    ? '    use_frameworks! :linkage => :static\n'
    : '';
  const customPods = indentCustomPods(podsRbContent);

  return `
target '${targetName}' do
${frameworksLine}    platform :ios, '${deploymentTarget}'${customPods}
  end
`;
}

/**
 * Podfile block for expo-ui widgets — mirrors expo-widgets `withPodsLinking`
 * (`use_expo_modules_widgets!` + thin RN host for the layout sandbox).
 */
export function generateExpoUiWidgetTargetBlock({
  targetName,
  deploymentTarget,
  podsRbContent,
}: {
  targetName: string;
  deploymentTarget: string;
  podsRbContent?: string;
}): string {
  const customPods = indentCustomPods(podsRbContent);
  return `
require File.join(File.dirname(\`node --print "require.resolve('expo-widgets/package.json')"\`), "scripts/autolinking")

target '${targetName}' do
    platform :ios, '${deploymentTarget}'
    use_expo_modules_widgets!

    if ENV['EXPO_USE_COMMUNITY_AUTOLINKING'] == '1'
      config_command = ['node', '-e', "process.argv=['', '', 'config'];require('@react-native-community/cli').run()"];
    else
      config_command = [
        'node',
        '--no-warnings',
        '--eval',
        "require(require.resolve('expo-modules-autolinking', { paths: [require.resolve('expo/package.json')] }))(process.argv.slice(1))",
        'react-native-config',
        '--json',
        '--platform',
        'ios'
      ]
    end

    config = use_expo_native_module!(config_command)

    use_frameworks! :linkage => podfile_properties['ios.useFrameworks'].to_sym if podfile_properties['ios.useFrameworks']
    use_frameworks! :linkage => ENV['USE_FRAMEWORKS'].to_sym if ENV['USE_FRAMEWORKS']

    use_react_native!(
      :path => config[:reactNativePath],
      :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
      :app_path => "#{Pod::Config.instance.installation_root}/..",
      :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
    )
${customPods}
  end
`;
}

const EXPO_WIDGETS_POST_INSTALL_MARKER = 'expo_widgets_post_install(installer)';

/**
 * Ensure `expo_widgets_post_install` runs so ExpoModulesCore / ExpoUI / React
 * can set APPLICATION_EXTENSION_API_ONLY = No for the widget sandbox.
 */
export function ensureExpoWidgetsPostInstall(podfileContent: string): string {
  if (podfileContent.includes(EXPO_WIDGETS_POST_INSTALL_MARKER)) {
    return podfileContent;
  }

  if (!podfileContent.includes('post_install do |installer|')) {
    return `${podfileContent.trimEnd()}

post_install do |installer|
  ${EXPO_WIDGETS_POST_INSTALL_MARKER}
end
`;
  }

  return podfileContent.replace(
    /post_install do \|installer\|/,
    `post_install do |installer|
  ${EXPO_WIDGETS_POST_INSTALL_MARKER}`
  );
}

/**
 * Last `end` that opens a line (optional indent). Ignores `end` inside comments
 * such as `# [expo-targets-*-end]`.
 */
function findLastLineLevelEndIndex(podfileContent: string): number {
  const lineEnd = /^[ \t]*end\b/gm;
  let match: RegExpExecArray | null;
  let last: RegExpExecArray | null = null;
  while ((match = lineEnd.exec(podfileContent)) !== null) {
    last = match;
  }
  if (!last) {
    throw new Error('Could not find any end keyword in Podfile');
  }
  return last.index + last[0].length;
}

/**
 * Standalone targets are inserted as siblings AFTER the main target's closing
 * `end`, which prevents CocoaPods from auto-generating Expo module providers.
 */
function insertStandaloneTargetBlock(
  podfileContent: string,
  targetBlock: string,
  logger?: { log: (message: string) => void }
): string {
  const insertion = `\n\n${targetBlock.trim()}`;
  const hookStart = podfileContent.indexOf(
    EXCLUDED_PACKAGES_POST_INTEGRATE_START
  );
  if (hookStart !== -1) {
    logger?.log(
      'Inserting standalone target before excluded-packages post_integrate hook'
    );
    return `${podfileContent.slice(0, hookStart).trimEnd()}${insertion}\n\n${podfileContent.slice(hookStart)}`;
  }

  const mainTargetEndIndex = findLastLineLevelEndIndex(podfileContent);

  logger?.log(
    `Inserting standalone target after last line-level 'end' at position ${mainTargetEndIndex}`
  );

  return (
    podfileContent.slice(0, mainTargetEndIndex) +
    insertion +
    podfileContent.slice(mainTargetEndIndex)
  );
}

/**
 * Insert a target block into a Podfile.
 * React Native targets are nested inside main app to inherit dependencies.
 * Standalone targets are inserted as siblings to avoid Expo module autolinking.
 */
export function insertTargetBlock(
  podfileContent: string,
  targetBlock: string,
  options: {
    standalone?: boolean;
    logger?: { log: (message: string) => void };
  } = {}
): string {
  const { standalone = false, logger } = options;

  if (standalone) {
    return insertStandaloneTargetBlock(podfileContent, targetBlock, logger);
  }

  logger?.log('Inserting React Native target nested inside main target');

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
 * Find the index just past the `end` that closes the block opened at
 * `afterDoIndex`, counting every Ruby keyword that requires an `end`.
 */
function findBlockEndIndex(
  podfileContent: string,
  afterDoIndex: number
): number {
  const blockRegex = /\b(do|if|unless|case|begin|class|module|def|end)\b/g;
  blockRegex.lastIndex = afterDoIndex;

  // Start at depth 1 because we're already inside the block (after 'do').
  let depth = 1;
  let match = blockRegex.exec(podfileContent);

  while (match !== null) {
    if (match[1] === 'end') {
      depth--;
      if (depth === 0) {
        return match.index + match[0].length;
      }
    } else {
      depth++;
    }
    match = blockRegex.exec(podfileContent);
  }

  return -1;
}

/**
 * Remove an existing target block from a Podfile.
 * Finds the target declaration and removes it along with its entire do/end block.
 */
export function removeTargetBlock(
  podfileContent: string,
  targetName: string
): string {
  const targetRegex = new RegExp(`target\\s+['"]${targetName}['"]\\s+do`, 'g');
  const targetMatch = targetRegex.exec(podfileContent);

  if (!targetMatch) {
    return podfileContent; // Target doesn't exist, nothing to remove
  }

  const startIndex = targetMatch.index;
  const targetEndIndex = findBlockEndIndex(
    podfileContent,
    targetMatch.index + targetMatch[0].length
  );

  if (targetEndIndex === -1) {
    throw new Error(`Could not find closing end for target '${targetName}'`);
  }

  // Remove the target block including leading whitespace/newlines
  let removeStart = startIndex;
  while (removeStart > 0 && /[\s\n]/.test(podfileContent[removeStart - 1])) {
    removeStart--;
  }

  // Drop at most one trailing newline
  const removeEnd =
    podfileContent[targetEndIndex] === '\n'
      ? targetEndIndex + 1
      : targetEndIndex;

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
    `target\\s+'${mainTargetName}'\\s+do([\\s\\S]*?)(?=post_install|\\ntarget\\s+|$)`
  );

  const match = podfileContent.match(targetRegex);
  if (!match) {
    return podfileContent;
  }

  const targetBlock = match[1];

  // Check if unconditional use_frameworks! :linkage => :static already exists
  // Conditional statements use variables (podfile_properties or ENV), so checking
  // for the literal ':static' ensures we only match unconditional statements
  if (targetBlock.includes('use_frameworks! :linkage => :static')) {
    return podfileContent;
  }

  // Find insertion point: after "target 'Name' do" line
  const targetLineRegex = new RegExp(
    `(target\\s+'${mainTargetName}'\\s+do\\s*\\n)`,
    'm'
  );

  return podfileContent.replace(
    targetLineRegex,
    '$1  use_frameworks! :linkage => :static\n\n'
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
    return podfileContent;
  }

  const currentVersion = match[3];
  const quoteChar = match[2]; // Preserve original quote style (' or ")
  const currentVersionNum = Number.parseFloat(currentVersion);
  const newVersionNum = Number.parseFloat(deploymentTarget);

  // Only update if the new version is higher
  if (newVersionNum > currentVersionNum) {
    // Replace the entire platform line with a simple version
    // Use the same quote style as the original
    return podfileContent.replace(
      platformLineRegex,
      `$1${quoteChar}${deploymentTarget}${quoteChar}`
    );
  }

  return podfileContent;
}

const STANDALONE_DEPLOYMENT_START = '    # [expo-targets-standalone-start]';
const STANDALONE_DEPLOYMENT_END = '    # [expo-targets-standalone-end]';

/**
 * Ruby that pins one extension target's deployment target, both in the Pods
 * project and in the xcconfig the extension references.
 */
const DEPLOYMENT_TARGET_RULE = `      if target.name.include?('{{TARGET_NAME}}')
        target.build_configurations.each do |config|
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '{{DEPLOYMENT_TARGET}}'
          # Also update the xcconfig file
          xcconfig_path = config.base_configuration_reference.real_path
          if xcconfig_path && File.exist?(xcconfig_path)
            xcconfig_content = File.read(xcconfig_path)
            # Remove existing IPHONEOS_DEPLOYMENT_TARGET if present
            xcconfig_content.gsub!(/^IPHONEOS_DEPLOYMENT_TARGET = .*$/, '')
            # Add deployment target
            xcconfig_content += "\\nIPHONEOS_DEPLOYMENT_TARGET = {{DEPLOYMENT_TARGET}}\\n"
            File.write(xcconfig_path, xcconfig_content)
          end
        end
      end`;

function buildDeploymentTargetFix(
  extensions: { targetName: string; deploymentTarget: string }[]
): string {
  const rules = extensions
    .map((ext) =>
      DEPLOYMENT_TARGET_RULE.replace(
        /{{TARGET_NAME}}/g,
        ext.targetName
      ).replace(/{{DEPLOYMENT_TARGET}}/g, ext.deploymentTarget)
    )
    .join('\n');

  return `${STANDALONE_DEPLOYMENT_START}
    # Fix standalone extension deployment targets
    installer.pods_project.targets.each do |target|
${rules}
    end
${STANDALONE_DEPLOYMENT_END}`;
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

  const content = removeMarkedBlock(
    podfileContent,
    STANDALONE_DEPLOYMENT_START,
    STANDALONE_DEPLOYMENT_END
  );

  const lines = content.split('\n');
  const postInstallEndLine = findPostInstallEndLine(lines);

  if (postInstallEndLine === -1) {
    return content;
  }

  // Insert before the closing 'end' of post_install
  const beforeLines = lines.slice(0, postInstallEndLine).join('\n');
  const afterLines = lines.slice(postInstallEndLine).join('\n');

  return `${beforeLines}\n${buildDeploymentTargetFix(extensions)}\n${afterLines}`;
}

const REACT_NATIVE_PATHS_START = '    # [expo-targets-start]';
const REACT_NATIVE_PATHS_END = '    # [expo-targets-end]';

/**
 * Ruby that copies the Swift-relevant search paths from the main app's Pods
 * target (and its xcconfig) onto one React Native extension target.
 */
const FRAMEWORK_PATHS_RULE = `      if target.name.include?('{{TARGET_NAME}}')
        target.build_configurations.each do |config|
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '{{DEPLOYMENT_TARGET}}'
          # Copy framework search paths from main app target
          main_target = installer.pods_project.targets.find { |t| t.name == '{{MAIN_PODS_TARGET}}' }
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
            xcconfig_content += "\\nIPHONEOS_DEPLOYMENT_TARGET = {{DEPLOYMENT_TARGET}}\\n"
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
                  # Copy OTHER_SWIFT_FLAGS (module maps) but drop host-only Updates /
                  # DevLauncher maps. Must strip the paired -Xcc too — otherwise
                  # swiftc sees -Xcc -Xcc -fmodule-map-file=... and rejects the flag.
                  swift_flags_match = main_xcconfig_content.match(/^OTHER_SWIFT_FLAGS = (.+)$/m)
                  if swift_flags_match
                    swift_flags = swift_flags_match[1]
                      .gsub(/\\s*-Xcc\\s+-fmodule-map-file="[^"]*EXUpdates[^"]*"/, '')
                      .gsub(/\\s*-Xcc\\s+-fmodule-map-file="[^"]*EXDevLauncher[^"]*"/, '')
                      .gsub(/\\s*-Xcc\\s+-fmodule-map-file="[^"]*expo-dev-client[^"]*"/, '')
                      .gsub(/\\s*-fmodule-map-file="[^"]*EXUpdates[^"]*"/, '')
                      .gsub(/\\s*-fmodule-map-file="[^"]*EXDevLauncher[^"]*"/, '')
                      .gsub(/\\s*-fmodule-map-file="[^"]*expo-dev-client[^"]*"/, '')
                    xcconfig_content.gsub!(/^OTHER_SWIFT_FLAGS = .*$/, '')
                    xcconfig_content += "\\nOTHER_SWIFT_FLAGS = #{swift_flags}\\n"
                  end
                  # Copy SWIFT_INCLUDE_PATHS (drop host-only EXUpdates)
                  swift_include_match = main_xcconfig_content.match(/^SWIFT_INCLUDE_PATHS = (.+)$/m)
                  if swift_include_match
                    swift_includes = swift_include_match[1]
                      .gsub(/\\s*"\\$\\{PODS_CONFIGURATION_BUILD_DIR\\}\\/EXUpdates"/, '')
                      .gsub(/\\s*"\\$\\{PODS_CONFIGURATION_BUILD_DIR\\}\\/EXDevLauncher"/, '')
                    xcconfig_content.gsub!(/^SWIFT_INCLUDE_PATHS = .*$/, '')
                    xcconfig_content += "\\nSWIFT_INCLUDE_PATHS = #{swift_includes}\\n"
                  end
                end
              end
            end
            File.write(xcconfig_path, xcconfig_content)
          end
        end
      end`;

function buildFrameworkPathsFix(
  extensions: { targetName: string; deploymentTarget: string }[],
  mainTargetName: string
): string {
  const mainPodsTarget = `Pods-${mainTargetName}`;
  const rules = extensions
    .map((ext) =>
      FRAMEWORK_PATHS_RULE.replace(/{{TARGET_NAME}}/g, ext.targetName)
        .replace(/{{DEPLOYMENT_TARGET}}/g, ext.deploymentTarget)
        .replace(/{{MAIN_PODS_TARGET}}/g, mainPodsTarget)
    )
    .join('\n');

  return `${REACT_NATIVE_PATHS_START}
    # Fix React Native extension framework search paths
    installer.pods_project.targets.each do |target|
${rules}
    end
${REACT_NATIVE_PATHS_END}`;
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

  const content = removeMarkedBlock(
    podfileContent,
    REACT_NATIVE_PATHS_START,
    REACT_NATIVE_PATHS_END
  );

  const lines = content.split('\n');
  const endLine = findReactNativePostInstallEndLine(lines);

  if (endLine === -1) {
    return content;
  }

  // Insert right after the closing paren of react_native_post_install
  const insertPosition = lines.slice(0, endLine + 1).join('\n').length;
  const beforeInsert = content.substring(0, insertPosition);
  const afterInsert = content.substring(insertPosition);
  const needsNewlineBefore = !beforeInsert.endsWith('\n');

  // Keep the indentation of what follows: trimming it would break the "  end"
  // of post_install that ensureExtensionDeploymentTargets relies on.
  return (
    beforeInsert.trimEnd() +
    (needsNewlineBefore ? '\n' : '') +
    buildFrameworkPathsFix(extensions, mainTargetName) +
    '\n' +
    afterInsert
  );
}

function rubySingleQuoted(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** Ruby body lines for the excludedPackages post_integrate hook (minus hash). */
const EXCLUDED_PACKAGES_RUBY_PREFIX = [
  EXCLUDED_PACKAGES_POST_INTEGRATE_START,
  '# Strip unused host packages from nested RN ExpoModulesProviders and linker flags.',
  '# Nested use_expo_modules!(exclude:) is a no-op (parent AutolinkingManager);',
  '# Expo regenerates the provider during integrate_user_targets after post_install.',
  '# Do not copy host OTHER_LDFLAGS onto the appex — inherit! :search_paths already',
  '# did; subtract unused -l / -framework / module maps from Pods-<target> xcconfigs.',
  'post_integrate do |installer|',
  '  exclusions = {',
] as const;

const EXCLUDED_PACKAGES_RUBY_SUFFIX = [
  '  }',
  '  exclusions.each do |target_name, spec|',
  '    packages = spec[:packages] || []',
  '    tokens = spec[:linker] || []',
  '    next if packages.empty? && tokens.empty?',
  '    support_dir = File.join(installer.sandbox.root, \'Target Support Files\', "Pods-#{target_name}")',
  "    script_path = File.join(support_dir, 'expo-configure-project.sh')",
  "    provider_path = File.join(support_dir, 'ExpoModulesProvider.swift')",
  '    if File.exist?(script_path) && !packages.empty?',
  '      content = File.read(script_path)',
  '      packages.each do |pkg|',
  '        content.gsub!(/\\s*"#{Regexp.escape(pkg)}"/, \'\')',
  '      end',
  '      File.write(script_path, content)',
  "      ok = system({ 'PODS_ROOT' => installer.sandbox.root.to_s }, 'bash', script_path)",
  '      unless ok',
  '        raise "[expo-targets] Failed to regenerate ExpoModulesProvider for #{target_name} after excludedPackages strip"',
  '      end',
  '      unless File.exist?(provider_path)',
  '        raise "[expo-targets] ExpoModulesProvider missing after regenerate for #{target_name}"',
  '      end',
  '      # Host-only: ExtensionBundle install API must not register inside RN appexes',
  '      # (auto-enable used to treat its presence as "running on host").',
  '      provider = File.read(provider_path)',
  "      provider.gsub!(/^\\s*\\(module: ExpoTargetsExtensionBundleModule\\.self.*?\\),?\\n/, '')",
  '      File.write(provider_path, provider)',
  '      Pod::UI.puts "[expo-targets] Applied excludedPackages to #{target_name}: #{packages.join(\', \')}"',
  '    elsif !packages.empty?',
  '      Pod::UI.warn "[expo-targets] Missing #{script_path}; skip excludedPackages for #{target_name}"',
  '    end',
  '    unless tokens.empty?',
  "      Dir.glob(File.join(support_dir, '*.xcconfig')).each do |xcconfig_path|",
  '        xc = File.read(xcconfig_path)',
  '        tokens.each do |token|',
  '          xc.gsub!(/\\s*-l"?#{Regexp.escape(token)}"?/, \'\')',
  '          xc.gsub!(/\\s*-framework\\s+"?#{Regexp.escape(token)}"?/, \'\')',
  '          xc.gsub!(/\\s*-Xcc\\s+-fmodule-map-file="[^"]*#{Regexp.escape(token)}[^"]*"/, \'\')',
  '          xc.gsub!(/\\s*-fmodule-map-file="[^"]*#{Regexp.escape(token)}[^"]*"/, \'\')',
  '        end',
  '        File.write(xcconfig_path, xc)',
  '      end',
  '      Pod::UI.puts "[expo-targets] Stripped #{tokens.length} linker tokens from Pods-#{target_name}"',
  '    end',
  '  end',
  'end',
  EXCLUDED_PACKAGES_POST_INTEGRATE_END,
  '',
] as const;

function buildExcludedPackagesPostIntegrate(
  exclusions: {
    targetName: string;
    packages: string[];
    linkerTokens?: string[];
  }[]
): string {
  const hashEntries = exclusions
    .map(({ targetName, packages, linkerTokens }) => {
      const pkgs = packages.map(rubySingleQuoted).join(', ');
      const tokens = (linkerTokens ?? []).map(rubySingleQuoted).join(', ');
      return `    ${rubySingleQuoted(targetName)} => { :packages => [${pkgs}], :linker => [${tokens}] }`;
    })
    .join(',\n');

  return [
    ...EXCLUDED_PACKAGES_RUBY_PREFIX,
    hashEntries,
    ...EXCLUDED_PACKAGES_RUBY_SUFFIX,
  ].join('\n');
}

/**
 * Ensure a top-level `post_integrate` hook strips `excludedPackages` from each
 * nested RN target's `expo-configure-project.sh` and regenerates its provider.
 * Idempotent via START/END markers. No exclusions → remove any prior hook.
 */
export function ensureExcludedPackagesPostIntegrate(
  podfileContent: string,
  exclusions: {
    targetName: string;
    packages: string[];
    linkerTokens?: string[];
  }[]
): string {
  const without = removeMarkedBlock(
    podfileContent,
    EXCLUDED_PACKAGES_POST_INTEGRATE_START,
    EXCLUDED_PACKAGES_POST_INTEGRATE_END
  );

  if (exclusions.length === 0) {
    return without.trimEnd() + '\n';
  }

  const block = buildExcludedPackagesPostIntegrate(exclusions);
  return `${without.trimEnd()}\n\n${block}`;
}
