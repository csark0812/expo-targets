import {
  ConfigPlugin,
  IOSConfig,
  withXcodeProject,
} from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';

export const withTargetAssets: ConfigPlugin<{
  targetName: string;
  targetDirectory: string;
}> = (config, props) => {
  return withXcodeProject(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const targetDirectory = path.join(
      projectRoot,
      props.targetDirectory,
      'ios'
    );
    const buildDirectory = path.join(targetDirectory, 'build');

    // Sanitize target name to match Xcode target name
    const targetProductName = props.targetName.replace(/[^a-zA-Z0-9]/g, '');
    const targetGroupPath = path.join(
      config.modRequest.platformProjectRoot,
      targetProductName
    );

    // Copy Assets.xcassets if it exists
    const assetsSource = path.join(buildDirectory, 'Assets.xcassets');
    const assetsDest = path.join(targetGroupPath, 'Assets.xcassets');

    if (fs.existsSync(assetsSource)) {
      // Copy the entire Assets.xcassets folder
      fs.cpSync(assetsSource, assetsDest, { recursive: true });
      console.log(
        `[expo-targets] Copied Assets.xcassets to ${targetProductName}/`
      );

      // Find the target UUID
      const xcodeProject = config.modResults as any;
      const pbxNativeTargetSection =
        xcodeProject.hash.project.objects.PBXNativeTarget || {};

      let targetUuid: string | undefined;
      for (const key in pbxNativeTargetSection) {
        if (key.endsWith('_comment')) continue;
        const target = pbxNativeTargetSection[key];
        if (target && target.name === targetProductName) {
          targetUuid = key;
          break;
        }
      }

      if (targetUuid) {
        // Add Assets.xcassets as a resource file using the proper API
        const relativePath = path.relative(
          config.modRequest.platformProjectRoot,
          assetsDest
        );

        // Ensure the target's group exists
        IOSConfig.XcodeUtils.ensureGroupRecursively(
          xcodeProject,
          targetProductName
        );

        // Add the resource file to the target
        IOSConfig.XcodeUtils.addResourceFileToGroup({
          filepath: relativePath,
          groupName: targetProductName,
          project: xcodeProject,
          isBuildFile: true,
          verbose: true,
          targetUuid,
        });

        console.log(
          `[expo-targets] Added Assets.xcassets to ${targetProductName} Resources build phase`
        );
      } else {
        console.warn(
          `[expo-targets] Could not find target UUID for ${targetProductName} to add Assets.xcassets`
        );
      }
    }

    return config;
  });
};
