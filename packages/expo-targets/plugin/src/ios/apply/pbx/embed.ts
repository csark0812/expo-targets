import type { XcodeProject } from '@expo/config-plugins';

import type { XcodeTarget } from './types';

/**
 * "Embed App Extensions" / "Embed App Clips" copy-files phases on the host app.
 * Both entry points are idempotent: re-running a prebuild must not add a second
 * embed phase or a duplicate build file for the same product.
 */

const APP_EXTENSION_DST_SUBFOLDER_SPEC = 13;
const EMBED_PHASE_NAME = 'Embed App Extensions';
const EMBED_ATTRIBUTES = ['RemoveHeadersOnCopy', 'CodeSignOnCopy'];

interface PbxSections {
  buildFileSection: Record<string, any>;
  fileRefSection: Record<string, any>;
}

function ensureEmbedAttributes(buildFile: any): void {
  if (!Array.isArray(buildFile.settings?.ATTRIBUTES)) {
    buildFile.settings = { ATTRIBUTES: [...EMBED_ATTRIBUTES] };
    return;
  }

  const attrs: string[] = buildFile.settings.ATTRIBUTES;
  for (const attr of EMBED_ATTRIBUTES) {
    if (!attrs.includes(attr)) {
      attrs.push(attr);
    }
  }
}

/**
 * A product is identified by either the `path` or the `name` of its file
 * reference, both of which may be quoted in the pbxproj.
 */
function productNamesForBuildFile(
  { fileRefSection }: PbxSections,
  buildFile: any
): string[] {
  const fileRef = fileRefSection?.[buildFile.fileRef];
  return [fileRef?.path, fileRef?.name]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.replace(/"/g, ''));
}

/**
 * Give the extension's own build file the copy attributes it needs, wherever
 * in the project it happens to live.
 */
function configureExtensionBuildFile(
  sections: PbxSections,
  targetFileName: string
): void {
  for (const buildFileKey in sections.buildFileSection) {
    if (buildFileKey.endsWith('_comment')) {
      continue;
    }

    const buildFile = sections.buildFileSection[buildFileKey];
    if (!buildFile?.fileRef) {
      continue;
    }

    const names = productNamesForBuildFile(sections, buildFile);
    if (names.includes(targetFileName)) {
      ensureEmbedAttributes(buildFile);
      return;
    }
  }
}

function findNamedEmbedPhase(
  copyFilesPhases: Record<string, any>
): string | undefined {
  for (const phaseKey in copyFilesPhases) {
    if (phaseKey.endsWith('_comment')) {
      continue;
    }
    const phase = copyFilesPhases[phaseKey];
    if (
      phase?.dstSubfolderSpec === APP_EXTENSION_DST_SUBFOLDER_SPEC &&
      (phase.name === `"${EMBED_PHASE_NAME}"` ||
        copyFilesPhases[`${phaseKey}_comment`] === EMBED_PHASE_NAME)
    ) {
      return phaseKey;
    }
  }
}

/**
 * Attributes every `.appex` build file in a phase and records its UUID.
 * Returns whether the phase embeds an app extension at all.
 */
function registerAppExtensionFiles(
  sections: PbxSections,
  phase: any,
  extensionBuildFiles: Set<string>
): boolean {
  let found = false;

  for (const file of phase.files) {
    const buildFile = sections.buildFileSection?.[file.value];
    if (!buildFile?.fileRef) {
      continue;
    }
    const isAppExtension = productNamesForBuildFile(sections, buildFile).some(
      (name) => name.endsWith('.appex')
    );
    if (isAppExtension) {
      found = true;
      extensionBuildFiles.add(file.value);
      ensureEmbedAttributes(buildFile);
    }
  }

  return found;
}

function isExtensionEmbedPhase(
  copyFilesPhases: Record<string, any>,
  phaseKey: string,
  primaryPhaseKey?: string
): boolean {
  if (phaseKey.endsWith('_comment') || phaseKey === primaryPhaseKey) {
    return false;
  }
  const phase = copyFilesPhases[phaseKey];
  return (
    phase?.dstSubfolderSpec === APP_EXTENSION_DST_SUBFOLDER_SPEC &&
    Boolean(phase.files)
  );
}

/**
 * Locate every phase that embeds app extensions. The first one either already
 * carries the standard name or is promoted to primary; the rest get merged.
 */
function collectEmbedPhases({
  sections,
  copyFilesPhases,
}: {
  sections: PbxSections;
  copyFilesPhases: Record<string, any>;
}): {
  primaryPhaseKey?: string;
  phasesToMerge: string[];
  extensionBuildFiles: Set<string>;
} {
  let primaryPhaseKey = findNamedEmbedPhase(copyFilesPhases);
  const phasesToMerge: string[] = [];
  const extensionBuildFiles = new Set<string>();

  for (const phaseKey in copyFilesPhases) {
    if (!isExtensionEmbedPhase(copyFilesPhases, phaseKey, primaryPhaseKey)) {
      continue;
    }

    const embedsExtensions = registerAppExtensionFiles(
      sections,
      copyFilesPhases[phaseKey],
      extensionBuildFiles
    );
    if (!embedsExtensions) {
      continue;
    }

    if (primaryPhaseKey) {
      phasesToMerge.push(phaseKey);
    } else {
      primaryPhaseKey = phaseKey;
    }
  }

  return { primaryPhaseKey, phasesToMerge, extensionBuildFiles };
}

function mergeEmbedPhases({
  copyFilesPhases,
  primaryPhaseKey,
  phasesToMerge,
  extensionBuildFiles,
}: {
  copyFilesPhases: Record<string, any>;
  primaryPhaseKey: string;
  phasesToMerge: string[];
  extensionBuildFiles: Set<string>;
}): void {
  const primaryPhase = copyFilesPhases[primaryPhaseKey];
  primaryPhase.name = `"${EMBED_PHASE_NAME}"`;
  copyFilesPhases[`${primaryPhaseKey}_comment`] = EMBED_PHASE_NAME;

  if (!primaryPhase.files) {
    primaryPhase.files = [];
  }

  const existingFiles = new Set(primaryPhase.files.map((f: any) => f.value));

  for (const phaseKey of phasesToMerge) {
    for (const file of copyFilesPhases[phaseKey]?.files || []) {
      if (
        extensionBuildFiles.has(file.value) &&
        !existingFiles.has(file.value)
      ) {
        primaryPhase.files.push(file);
        existingFiles.add(file.value);
      }
    }
  }
}

function findMainAppTarget(
  nativeTargets: Record<string, any> | undefined
): any {
  for (const targetKey in nativeTargets) {
    if (targetKey.endsWith('_comment')) {
      continue;
    }
    const target = nativeTargets[targetKey];
    if (target?.productType === '"com.apple.product-type.application"') {
      return target;
    }
  }
}

/**
 * The merged-away phases are dropped by detaching them from the host app.
 */
function detachMergedPhases(
  project: XcodeProject,
  phasesToMerge: string[]
): void {
  if (phasesToMerge.length === 0) {
    return;
  }

  const objects = (project as any).hash.project.objects;
  const mainAppTarget = findMainAppTarget(objects.PBXNativeTarget);

  if (mainAppTarget?.buildPhases) {
    mainAppTarget.buildPhases = mainAppTarget.buildPhases.filter(
      (phase: any) => !phasesToMerge.includes(phase.value)
    );
  }
}

/**
 * Configure embed settings for app extension.
 * Consolidates all app extensions into a SINGLE "Embed App Extensions" phase.
 */
export function configureAppExtensionEmbed({
  project,
  targetProductName,
}: {
  project: XcodeProject;
  targetProductName: string;
}): void {
  const objects = (project as any).hash.project.objects;
  const sections: PbxSections = {
    buildFileSection: objects.PBXBuildFile,
    fileRefSection: objects.PBXFileReference,
  };

  configureExtensionBuildFile(sections, `${targetProductName}.appex`);

  const copyFilesPhases = objects.PBXCopyFilesBuildPhase;
  const { primaryPhaseKey, phasesToMerge, extensionBuildFiles } =
    collectEmbedPhases({ sections, copyFilesPhases });

  if (!(primaryPhaseKey && copyFilesPhases[primaryPhaseKey])) {
    return;
  }

  mergeEmbedPhases({
    copyFilesPhases,
    primaryPhaseKey,
    phasesToMerge,
    extensionBuildFiles,
  });
  detachMergedPhases(project, phasesToMerge);
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
