import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import type { ExtensionType } from '../../domain';
import { TYPE_CHARACTERISTICS } from '../../domain';
import * as File from '../utils/file';
import * as Paths from '../utils/paths';
import * as Safari from '../utils/safari';

/**
 * Everything the pipeline needs to know about what already exists on disk for
 * one target. This is the only place the iOS pipeline reads the user's target
 * directory: planners take a `TargetWorkspace` and never touch the file system.
 */
export type TargetWorkspace = {
  projectRoot: string;
  /** Target directory relative to the project root, e.g. `targets/my-share`. */
  directory: string;
  type: ExtensionType;
  /** Absolute path to `<projectRoot>/<directory>/ios`. */
  targetDirectory: string;
  /** Absolute path to the generated build directory inside the target. */
  targetBuildPath: string;
  /** Existing user Swift files, relative to `targetDirectory`. */
  swiftFiles: string[];
  /**
   * Extra files to Copy Bundle Resources (relative to `targetDirectory`).
   * Content blockers need `blockerList.json` in the appex root.
   */
  bundleResourceFiles: string[];
  /** Absolute path to the user's `Assets.xcassets` / `Stickers.xcassets`. */
  userAssetsPath: string;
  hasUserAssets: boolean;
  /** Absolute path to a user-provided Safari `Resources` folder. */
  userSafariResourcesPath: string;
  hasCustomSafariResources: boolean;
  hasUserSafariSwiftHandler: boolean;
  hasUserReactNativeViewController: boolean;
  hasUserMessagesViewController: boolean;
};

const SWIFT_GLOB_IGNORE = [
  '**/Tests/**',
  '**/*.test.swift',
  '**/*Tests.swift',
  // Exclude build directory - those are generated files
  '**/build/**',
];

function isTestOrBuildSwiftFile(file: string): boolean {
  return (
    file.includes('Tests/') ||
    file.includes('/Tests') ||
    file.endsWith('.test.swift') ||
    file.endsWith('Tests.swift') ||
    file.startsWith('build/')
  );
}

function observeSwiftFiles(targetDirectory: string): string[] {
  return globSync('**/*.swift', {
    cwd: targetDirectory,
    absolute: false,
    ignore: SWIFT_GLOB_IGNORE,
  }).filter((file) => !isTestOrBuildSwiftFile(file));
}

/**
 * Read the on-disk state of a target directory.
 */
export function buildTargetWorkspace({
  projectRoot,
  directory,
  type,
  buildSubdirectory,
}: {
  projectRoot: string;
  directory: string;
  type: ExtensionType;
  buildSubdirectory?: string;
}): TargetWorkspace {
  const typeConfig = TYPE_CHARACTERISTICS[type];
  const targetDirectory = Paths.getTargetDirectory({
    projectRoot,
    targetDirectory: directory,
  });
  const absoluteTargetRoot = path.join(projectRoot, directory);
  const userAssetsPath = path.join(
    targetDirectory,
    type === 'stickers' ? 'Stickers.xcassets' : 'Assets.xcassets'
  );

  return {
    projectRoot,
    directory,
    type,
    targetDirectory,
    targetBuildPath: Paths.getTargetBuildPath({
      projectRoot,
      targetDirectory: directory,
      buildSubdirectory,
    }),
    swiftFiles: typeConfig.requiresCode
      ? observeSwiftFiles(targetDirectory)
      : [],
    bundleResourceFiles:
      type === 'content-blocker'
        ? globSync('*.json', {
            cwd: targetDirectory,
            absolute: false,
            ignore: ['**/build/**'],
          })
        : [],
    userAssetsPath,
    hasUserAssets: File.isDirectory(userAssetsPath),
    userSafariResourcesPath: path.join(targetDirectory, 'Resources'),
    hasCustomSafariResources:
      Safari.hasCustomSafariResources(absoluteTargetRoot),
    hasUserSafariSwiftHandler:
      Safari.hasUserSafariSwiftHandler(absoluteTargetRoot),
    hasUserReactNativeViewController: fs.existsSync(
      path.join(targetDirectory, 'ReactNativeViewController.swift')
    ),
    hasUserMessagesViewController: fs.existsSync(
      path.join(targetDirectory, 'MessagesViewController.swift')
    ),
  };
}
