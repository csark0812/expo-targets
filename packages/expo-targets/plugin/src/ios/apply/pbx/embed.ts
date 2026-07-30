import type { XcodeProject } from '@expo/config-plugins';

import type { XcodeTarget } from './types';

/**
 * "Embed App Extensions" / "Embed App Clips" copy-files phases on the host app.
 * Both entry points are idempotent: re-running a prebuild must not add a second
 * embed phase or a duplicate build file for the same product.
 */

/**
 * Configure embed settings for app extension.
 * Consolidates all app extensions into a SINGLE "Embed App Extensions" phase.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity; tracked for refactor
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing complexity; tracked for refactor
export function configureAppExtensionEmbed({
  project,
  targetProductName,
}: {
  project: XcodeProject;
  targetProductName: string;
}): void {
  const xcodeProject = project as any;
  const buildFileSection = xcodeProject.hash.project.objects.PBXBuildFile;
  const fileRefSection = xcodeProject.hash.project.objects.PBXFileReference;
  const targetFileName = `${targetProductName}.appex`;

  const ensureAttributes = (buildFile: any) => {
    const desired = ['RemoveHeadersOnCopy', 'CodeSignOnCopy'];
    if (!(buildFile.settings && Array.isArray(buildFile.settings.ATTRIBUTES))) {
      buildFile.settings = { ATTRIBUTES: desired };
      return;
    }
    const attrs: string[] = buildFile.settings.ATTRIBUTES;
    // biome-ignore lint/complexity/noForEach: pre-existing; prefer for-of tracked
    desired.forEach((attr) => {
      if (!attrs.includes(attr)) {
        attrs.push(attr);
      }
    });
  };

  // Find and configure the PBXBuildFile for the extension (global scan)
  let foundBuildFile = false;
  for (const buildFileKey in buildFileSection) {
    if (buildFileKey.endsWith('_comment')) {
      continue;
    }

    const buildFile = buildFileSection[buildFileKey];
    if (buildFile?.fileRef) {
      const fileRef = fileRefSection[buildFile.fileRef];
      const refPath = fileRef?.path?.replace(/"/g, '');
      const refName = fileRef?.name?.replace(/"/g, '');

      if (refPath === targetFileName || refName === targetFileName) {
        ensureAttributes(buildFile);
        foundBuildFile = true;
        break;
      }
    }
  }

  if (!foundBuildFile) {
  }

  // Find or create a SINGLE "Embed App Extensions" phase
  const copyFilesPhases =
    xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase;

  // Step 1: Find existing "Embed App Extensions" phase (with proper name)
  let primaryPhaseKey: string | null = null;
  let primaryPhase: any = null;

  for (const phaseKey in copyFilesPhases) {
    if (phaseKey.endsWith('_comment')) {
      continue;
    }
    const phase = copyFilesPhases[phaseKey];
    if (
      phase?.dstSubfolderSpec === 13 &&
      (phase.name === '"Embed App Extensions"' ||
        copyFilesPhases[`${phaseKey}_comment`] === 'Embed App Extensions')
    ) {
      primaryPhaseKey = phaseKey;
      primaryPhase = phase;
      break;
    }
  }

  // Step 2: Consolidate - find all extension embedding phases and merge into primary
  const phasesToMerge: string[] = [];
  const extensionBuildFiles: Set<string> = new Set();

  for (const phaseKey in copyFilesPhases) {
    if (phaseKey.endsWith('_comment') || phaseKey === primaryPhaseKey) {
      continue;
    }
    const phase = copyFilesPhases[phaseKey];

    if (phase?.dstSubfolderSpec === 13 && phase.files) {
      // Check if this phase contains any .appex files
      let hasAppExtension = false;
      // biome-ignore lint/complexity/noForEach: pre-existing; prefer for-of tracked
      phase.files.forEach((file: any) => {
        const buildFileKey = file.value;
        const buildFile = buildFileSection?.[buildFileKey];
        if (!buildFile?.fileRef) {
          return;
        }
        const fileRef = fileRefSection?.[buildFile.fileRef];
        const refPath = fileRef?.path?.replace(/"/g, '');
        const refName = fileRef?.name?.replace(/"/g, '');
        if (refPath?.endsWith('.appex') || refName?.endsWith('.appex')) {
          hasAppExtension = true;
          extensionBuildFiles.add(buildFileKey);
          ensureAttributes(buildFile);
        }
      });

      if (hasAppExtension) {
        if (primaryPhaseKey) {
          phasesToMerge.push(phaseKey);
        } else {
          // Use this as the primary phase
          primaryPhaseKey = phaseKey;
          primaryPhase = phase;
        }
      }
    }
  }

  // Step 3: If we found a primary phase, merge all extensions into it
  if (primaryPhaseKey && primaryPhase) {
    // Rename to standard name
    primaryPhase.name = '"Embed App Extensions"';
    copyFilesPhases[`${primaryPhaseKey}_comment`] = 'Embed App Extensions';

    // Merge build files from other phases
    if (!primaryPhase.files) {
      primaryPhase.files = [];
    }

    const existingFiles = new Set(primaryPhase.files.map((f: any) => f.value));

    // biome-ignore lint/complexity/noForEach: pre-existing; prefer for-of tracked
    phasesToMerge.forEach((phaseKey) => {
      const phase = copyFilesPhases[phaseKey];
      if (phase?.files) {
        // biome-ignore lint/complexity/noForEach: pre-existing; prefer for-of tracked
        phase.files.forEach((file: any) => {
          const buildFileKey = file.value;
          if (
            extensionBuildFiles.has(buildFileKey) &&
            !existingFiles.has(buildFileKey)
          ) {
            primaryPhase.files.push(file);
            existingFiles.add(buildFileKey);
          }
        });
      }
    });

    // Step 4: Remove duplicate phases (mark for deletion by removing from main app build phases)
    if (phasesToMerge.length > 0) {
      // Get the main app target by finding the first application target
      const nativeTargets = xcodeProject.hash.project.objects.PBXNativeTarget;
      let mainAppTarget: any = null;

      for (const targetKey in nativeTargets) {
        if (targetKey.endsWith('_comment')) {
          continue;
        }
        const target = nativeTargets[targetKey];
        if (target?.productType === '"com.apple.product-type.application"') {
          mainAppTarget = target;
          break;
        }
      }

      if (mainAppTarget?.buildPhases) {
        mainAppTarget.buildPhases = mainAppTarget.buildPhases.filter(
          (phase: any) => !phasesToMerge.includes(phase.value)
        );
      }
    }
  }
}

const APP_CLIP_DST_SUBFOLDER_SPEC = 16;

/**
 * Find the "Embed App Clips" copy-files phase already attached to the host app.
 */
function findAppClipEmbedPhase({
  project,
  mainTargetUuid,
}: {
  project: XcodeProject;
  mainTargetUuid: string;
}): { uuid: string; phase: any } | undefined {
  const xcodeProject = project as any;
  const copyFilesPhases =
    xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase || {};
  const mainTarget =
    xcodeProject.hash.project.objects.PBXNativeTarget?.[mainTargetUuid];

  for (const entry of mainTarget?.buildPhases || []) {
    const phase = copyFilesPhases[entry.value];
    if (!phase) {
      continue;
    }
    const isAppClipPhase =
      phase.dstSubfolderSpec === APP_CLIP_DST_SUBFOLDER_SPEC ||
      phase.name === '"Embed App Clips"' ||
      copyFilesPhases[`${entry.value}_comment`] === 'Embed App Clips';
    if (isAppClipPhase) {
      return { uuid: entry.value, phase };
    }
  }
}

/**
 * Get (or create) the "Embed App Clips" phase on the host app.
 */
function ensureAppClipEmbedPhase({
  project,
  mainTargetUuid,
}: {
  project: XcodeProject;
  mainTargetUuid: string;
}): any {
  const existing = findAppClipEmbedPhase({ project, mainTargetUuid });
  if (existing) {
    return existing.phase;
  }

  const xcodeProject = project as any;
  const embedPhaseResult = xcodeProject.addBuildPhase(
    [],
    'PBXCopyFilesBuildPhase',
    'Embed App Clips',
    mainTargetUuid
  );
  const embedPhaseUuid = embedPhaseResult?.uuid || embedPhaseResult;

  if (!embedPhaseUuid) {
    return;
  }

  return xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase?.[
    embedPhaseUuid
  ];
}

/**
 * Configure embed settings for App Clip.
 * Reuses an existing "Embed App Clips" phase (and its build file for this
 * product) so repeated prebuilds stay idempotent.
 */
export function configureAppClipEmbed({
  project,
  mainTargetUuid,
  target,
  targetProductName,
}: {
  project: XcodeProject;
  mainTargetUuid: string;
  target: XcodeTarget;
  targetProductName: string;
}): void {
  const xcodeProject = project as any;

  // Get the App Clip product reference
  const appClipFileRef =
    target.pbxNativeTarget?.productReference || target.target?.productReference;

  if (!appClipFileRef) {
    return;
  }

  const phase = ensureAppClipEmbedPhase({ project, mainTargetUuid });

  if (!phase) {
    return;
  }

  // Configure phase for App Clips
  phase.dstPath = '"$(CONTENTS_FOLDER_PATH)/AppClips"';
  phase.dstSubfolderSpec = APP_CLIP_DST_SUBFOLDER_SPEC;
  phase.name = '"Embed App Clips"';

  if (!phase.files) {
    phase.files = [];
  }

  const buildFileSection = xcodeProject.hash.project.objects.PBXBuildFile;
  const alreadyEmbedded = phase.files.some(
    (file: any) => buildFileSection?.[file.value]?.fileRef === appClipFileRef
  );
  if (alreadyEmbedded) {
    return;
  }

  // Create a PBXBuildFile for the App Clip
  const buildFileUuid = xcodeProject.generateUuid();

  buildFileSection[buildFileUuid] = {
    isa: 'PBXBuildFile',
    fileRef: appClipFileRef,
    settings: {
      ATTRIBUTES: ['RemoveHeadersOnCopy'],
    },
  };
  buildFileSection[`${buildFileUuid}_comment`] =
    `${targetProductName}.app in Embed App Clips`;

  phase.files.push({
    value: buildFileUuid,
    comment: `${targetProductName}.app in Embed App Clips`,
  });
}
