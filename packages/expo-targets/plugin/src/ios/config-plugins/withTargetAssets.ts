import { ConfigPlugin, withXcodeProject } from '@expo/config-plugins';
import path from 'path';

import { Xcode, Paths, File } from '../utils';

export const withTargetAssets: ConfigPlugin<{
  targetName: string;
  targetDirectory: string;
}> = (config, props) => {
  return withXcodeProject(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const platformProjectRoot = config.modRequest.platformProjectRoot;

    // Sanitize target name to match Xcode target name
    const targetProductName = Paths.sanitizeTargetName(props.targetName);
    const targetGroupPath = Paths.getTargetGroupPath({
      platformProjectRoot,
      targetName: props.targetName,
    });

    // Copy Assets.xcassets if it exists
    const assetsSource = Paths.getAssetsXcassetsPath({
      projectRoot,
      targetDirectory: props.targetDirectory,
    });
    const assetsDest = path.join(targetGroupPath, 'Assets.xcassets');

    if (File.isDirectory(assetsSource)) {
      // Copy the entire Assets.xcassets folder
      File.copyDirectorySafe(assetsSource, assetsDest);
      console.log(
        `[expo-targets] Copied Assets.xcassets to ${targetProductName}/`
      );

      // Find the target UUID
      const xcodeProject = config.modResults as any;
      const targetUuid = Xcode.findTargetByProductName({
        project: xcodeProject,
        productName: targetProductName,
      });

      if (targetUuid) {
        // Add Assets.xcassets as a resource file using the proper API
        const relativePath = path.relative(platformProjectRoot, assetsDest);

        // Ensure the target's group exists
        Xcode.ensureGroupRecursively(xcodeProject, targetProductName);

        // Add the resource file to the target
        Xcode.addResourceFileToGroup({
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
