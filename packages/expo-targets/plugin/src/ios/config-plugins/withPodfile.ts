import {
  ConfigPlugin,
  withDangerousMod,
  IOSConfig,
} from '@expo/config-plugins';
import path from 'path';

import { Logger } from '../../logger';
import { Podfile, File } from '../utils';

const { getProjectName } = IOSConfig.XcodeUtils;

export const withTargetPodfile: ConfigPlugin<{
  targetName: string;
  deploymentTarget: string;
  excludedPackages?: string[];
  standalone?: boolean;
  logger: Logger;
}> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      let podfile = File.readFileIfExists(podfilePath);

      if (!podfile) {
        throw new Error(`Podfile not found at ${podfilePath}`);
      }

      // Remove existing target block if present (ensures correct placement on rebuild)
      if (Podfile.hasTargetBlock(podfile, props.targetName)) {
        props.logger.log(
          `Removing existing '${props.targetName}' target to ensure correct placement`
        );
        podfile = Podfile.removeTargetBlock(podfile, props.targetName);
      }

      const projectRoot = config.modRequest.projectRoot;
      const mainTargetName = getProjectName(projectRoot);

      // Only React Native extensions need main app to use_frameworks! (they inherit pods)
      // Standalone extensions are siblings and don't inherit, so they don't need this
      if (!props.standalone) {
        podfile = Podfile.ensureMainTargetUsesFrameworks(
          podfile,
          mainTargetName
        );
      }

      // For standalone targets, detect main app's use_frameworks! setting
      // CocoaPods requires host app and extensions to have matching use_frameworks! settings
      const mainUsesFrameworks = props.standalone
        ? Podfile.mainTargetUsesFrameworks(podfile, mainTargetName)
        : undefined;

      // Generate appropriate target block based on type
      // React Native targets are nested inside main target to inherit dependencies
      const targetBlock = props.standalone
        ? Podfile.generateStandaloneTargetBlock({
            targetName: props.targetName,
            deploymentTarget: props.deploymentTarget,
            useFrameworks: mainUsesFrameworks,
          })
        : Podfile.generateReactNativeTargetBlock({
            targetName: props.targetName,
            deploymentTarget: props.deploymentTarget,
          });

      props.logger.logSparse(
        true,
        `Updated Podfile`,
        `${props.standalone ? 'standalone' : 'React Native'} target: ${props.targetName}`
      );

      // Insert target block into Podfile
      // Standalone: sibling to avoid Expo autolinking, RN: nested to inherit
      podfile = Podfile.insertTargetBlock(
        podfile,
        targetBlock,
        props.standalone,
        props.logger
      );

      // For React Native targets, ensure framework search paths are configured
      // inherit! :complete doesn't always propagate framework search paths for Swift imports
      if (!props.standalone) {
        // Find all React Native extension targets nested inside main target
        // These targets use inherit! :complete to inherit pods from main app
        const reactNativeTargets: {
          targetName: string;
          deploymentTarget: string;
        }[] = [];

        // Find the main target block and extract nested targets from within it
        const mainTargetStart = podfile.indexOf(
          `target '${mainTargetName}' do`
        );
        if (mainTargetStart >= 0) {
          // Find the closing 'end' of the main target (before post_install)
          const postInstallStart = podfile.indexOf(
            'post_install do',
            mainTargetStart
          );
          const mainTargetBlock =
            postInstallStart >= 0
              ? podfile.substring(mainTargetStart, postInstallStart)
              : podfile.substring(mainTargetStart);

          // Match nested target blocks within main target that have inherit! :complete
          // Look for lines that match: target 'Name' do ... inherit! :complete ... end
          // We need to match complete target blocks, so we'll look for the pattern
          // and verify it's a nested target (not the main target itself)
          const lines = mainTargetBlock.split('\n');
          let inNestedTarget = false;
          let currentTargetName = '';
          let currentTargetLines: string[] = [];
          let nestedTargetDepth = 0;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check if this line starts a nested target
            const targetMatch = line.match(/^\s+target\s+'([^']+)'\s+do/);
            if (targetMatch && targetMatch[1] !== mainTargetName) {
              inNestedTarget = true;
              currentTargetName = targetMatch[1];
              currentTargetLines = [line];
              nestedTargetDepth = 1;
              continue;
            }

            // If we're in a nested target, collect lines until we find the closing 'end'
            if (inNestedTarget) {
              currentTargetLines.push(line);

              // Count nested blocks (do/end pairs)
              if (line.match(/\bdo\b/)) {
                nestedTargetDepth++;
              }
              if (line.match(/\bend\b/)) {
                nestedTargetDepth--;

                // If depth is 0, we've closed the target block
                if (nestedTargetDepth === 0) {
                  const targetBlock = currentTargetLines.join('\n');

                  // Check if this target has inherit! :complete
                  if (targetBlock.includes('inherit! :complete')) {
                    // Extract deployment target
                    const platformMatch = targetBlock.match(
                      /platform\s+:ios,\s+'([^']+)'/
                    );
                    const version = platformMatch
                      ? platformMatch[1]
                      : props.deploymentTarget;

                    reactNativeTargets.push({
                      targetName: currentTargetName,
                      deploymentTarget: version,
                    });
                  }

                  // Reset for next target
                  inNestedTarget = false;
                  currentTargetName = '';
                  currentTargetLines = [];
                }
              }
            }
          }
        }

        if (reactNativeTargets.length > 0) {
          // Inject framework search paths configuration into post_install hook
          podfile = Podfile.ensureReactNativeExtensionFrameworkPaths(
            podfile,
            reactNativeTargets,
            mainTargetName
          );
        }
      }

      // For standalone targets, inject deployment target fixes into post_install hook
      // Must be done in Podfile because xcconfig files are generated by CocoaPods
      if (props.standalone) {
        const extensionTargets: {
          targetName: string;
          deploymentTarget: string;
        }[] = [];
        const targetPattern =
          /target\s+'([^']+)'\s+do\s+platform\s+:ios,\s+'([^']+)'/g;
        let match;

        // Find all standalone extension targets in the Podfile (including the one we just inserted)
        while ((match = targetPattern.exec(podfile)) !== null) {
          const [, name, version] = match;
          if (name !== mainTargetName) {
            extensionTargets.push({
              targetName: name,
              deploymentTarget: version,
            });
          }
        }

        // Find the highest deployment target among all standalone extensions
        if (extensionTargets.length > 0) {
          const highestDeploymentTarget = extensionTargets.reduce(
            (highest, ext) => {
              const extVersion = parseFloat(ext.deploymentTarget);
              const highestVersion = parseFloat(highest.deploymentTarget);
              return extVersion > highestVersion ? ext : highest;
            }
          ).deploymentTarget;

          // Update Podfile platform line to match the highest extension deployment target
          // This ensures consistency and prevents linker errors
          podfile = Podfile.updatePodfilePlatform(
            podfile,
            highestDeploymentTarget
          );

          // Inject into post_install hook to fix after react_native_post_install runs
          podfile = Podfile.ensureExtensionDeploymentTargets(
            podfile,
            extensionTargets
          );
        }
      }

      File.writeFileSafe(podfilePath, podfile);
      return config;
    },
  ]);
};
