import path from 'node:path';
import type { XcodeProject } from '@expo/config-plugins';

import * as File from '../../utils/file';
import * as Paths from '../../utils/paths';
import { addResourceFileToGroup } from './groups';

/**
 * PBXFileReference creation for files referenced in place (outside `ios/`).
 */

const FILE_TYPES_BY_EXTENSION: Record<string, string> = {
  '.xcassets': 'folder.assetcatalog',
  '.swift': 'sourcecode.swift',
  '.h': 'sourcecode.c.h',
  '.m': 'sourcecode.c.objc',
  '.js': 'sourcecode.javascript',
  '.json': 'text.json',
  '.html': 'text.html',
  '.css': 'text.css',
  '.png': 'image.png',
};

function fileTypeFor(fileName: string, fallback?: string): string {
  const extension = Object.keys(FILE_TYPES_BY_EXTENSION).find((suffix) =>
    fileName.endsWith(suffix)
  );
  return extension
    ? FILE_TYPES_BY_EXTENSION[extension]
    : fallback || 'sourcecode.swift';
}

/**
 * Add file reference to group, pointing to external path.
 * Returns the file reference UUID.
 *
 * Reuses the reference a previous run left in the group: creating a second one
 * would give the file two PBXBuildFile entries in the same build phase.
 */
export function addExternalFileReference({
  project,
  groupUuid,
  filePath,
  fileName,
  fileType,
}: {
  project: XcodeProject;
  groupUuid: string;
  filePath: string;
  fileName: string;
  fileType?: string;
}): string {
  const xcodeProject = project as any;
  const fileReferences = xcodeProject.hash.project.objects.PBXFileReference;
  const group = xcodeProject.hash.project.objects.PBXGroup[groupUuid];

  if (!group.children) {
    group.children = [];
  }

  const existingChild = group.children.find(
    (child: any) =>
      child.comment === fileName && fileReferences[child.value] !== undefined
  );

  const fileRefUuid = existingChild?.value ?? xcodeProject.generateUuid();

  fileReferences[fileRefUuid] = {
    isa: 'PBXFileReference',
    lastKnownFileType: fileTypeFor(fileName, fileType),
    name: `"${fileName}"`,
    path: `"${filePath}"`,
    sourceTree: '"<group>"',
  };
  fileReferences[`${fileRefUuid}_comment`] = fileName;

  if (!existingChild) {
    group.children.push({ value: fileRefUuid, comment: fileName });
  }

  return fileRefUuid;
}

/**
 * Add Assets.xcassets to a target's Resources build phase if it exists.
 */
export function addTargetAssets({
  platformProjectRoot,
  targetName,
  targetUuid,
  xcodeProject,
  isStickers,
}: {
  platformProjectRoot: string;
  targetName: string;
  targetUuid: string;
  xcodeProject: any;
  isStickers?: boolean;
}): void {
  const _targetProductName = Paths.sanitizeTargetName(targetName);
  const assetsPath = Paths.getAssetsXcassetsPath({
    platformProjectRoot,
    targetName,
    isStickers,
  });
  // Get the actual group directory name (includes 'Target' suffix)
  const targetGroupPath = Paths.getTargetGroupPath({
    platformProjectRoot,
    targetName,
  });
  const targetDirName = path.basename(targetGroupPath);

  if (File.isDirectory(assetsPath)) {
    const _assetsFolderName = isStickers
      ? 'Stickers.xcassets'
      : 'Assets.xcassets';

    // Add Assets.xcassets as a resource file
    const relativePath = path.relative(platformProjectRoot, assetsPath);

    addResourceFileToGroup({
      filepath: relativePath,
      groupName: targetDirName,
      project: xcodeProject,
      isBuildFile: true,
      verbose: true,
      targetUuid,
    });
  } else {
    const _assetsFolderName = isStickers
      ? 'Stickers.xcassets'
      : 'Assets.xcassets';
  }
}
