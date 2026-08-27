import type { XcodeProject } from '@expo/config-plugins';

import type { Logger } from '../../../logger';

const PHASE_NAME = '[expo-targets] Sync App Clip CFBundleVersion';

/** Quote a string the way Expo writes host shell phases (single-line + \\n). */
function toPbxString(value: string): string {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')}"`;
}

/**
 * Copy host CURRENT_PROJECT_VERSION into the Clip Info.plist at compile time.
 * EAS remote versioning updates the host after prebuild; Clip plist would stay stale.
 */
export function buildClipBuildNumberScript(hostProductName: string): string {
  const host = hostProductName.replace(/"/g, '').replace(/\.app$/i, '');
  return `set +e
CLIP_PLIST="\${TARGET_BUILD_DIR}/\${INFOPLIST_PATH}"
if [ ! -f "$CLIP_PLIST" ]; then
  echo "expo-targets: skip Clip CFBundleVersion — Clip Info.plist missing"
  exit 0
fi

HOST_VERSION=""
if [ -n "\${PROJECT_FILE_PATH:-}" ] && [ -f "\${PROJECT_FILE_PATH}" ]; then
  HOST_VERSION=$(xcodebuild -project "\${PROJECT_FILE_PATH}" -target "${host}" -configuration "\${CONFIGURATION:-Release}" -showBuildSettings 2>/dev/null | awk -F' = ' '/^    CURRENT_PROJECT_VERSION = / { print $2; exit }')
fi

case "$HOST_VERSION" in
  ''|*'$('*|*[!0-9]*)
    echo "expo-targets: skip Clip CFBundleVersion — host build number unresolved"
    exit 0
    ;;
esac

/usr/libexec/PlistBuddy -c "Delete :CFBundleVersion" "$CLIP_PLIST" 2>/dev/null
/usr/libexec/PlistBuddy -c "Add :CFBundleVersion string \${HOST_VERSION}" "$CLIP_PLIST" 2>/dev/null
echo "expo-targets: set Clip CFBundleVersion to \${HOST_VERSION}"
exit 0
`;
}

function findShellScriptPhase({
  project,
  targetUuid,
  phaseName,
}: {
  project: XcodeProject;
  targetUuid: string;
  phaseName: string;
}): { uuid: string; phase: any } | undefined {
  const xcodeProject = project as any;
  const target = xcodeProject.hash.project.objects.PBXNativeTarget[targetUuid];
  const section = xcodeProject.hash.project.objects.PBXShellScriptBuildPhase;
  if (!(target?.buildPhases && section)) {
    return;
  }

  const quoted = `"${phaseName}"`;
  for (const ref of target.buildPhases) {
    const phase = section[ref.value];
    if (!phase) continue;
    if (phase.name === phaseName || phase.name === quoted) {
      return { uuid: ref.value, phase };
    }
  }
}

function applyPhaseFields(phase: any, shellScript: string): void {
  phase.name = `"${PHASE_NAME}"`;
  phase.shellPath = '/bin/sh';
  phase.shellScript = toPbxString(shellScript);
  phase.alwaysOutOfDate = 1;
  phase.inputPaths = [];
  phase.outputPaths = [];
  phase.runOnlyForDeploymentPostprocessing = 0;
}

export function ensureClipBuildNumberPhase({
  project,
  clipTargetUuid,
  hostProductName,
  logger,
}: {
  project: XcodeProject;
  clipTargetUuid: string;
  hostProductName: string;
  logger?: Logger;
}): void {
  const xcodeProject = project as any;
  const shellScript = buildClipBuildNumberScript(hostProductName);
  const existing = findShellScriptPhase({
    project,
    targetUuid: clipTargetUuid,
    phaseName: PHASE_NAME,
  });

  if (existing) {
    applyPhaseFields(existing.phase, shellScript);
    logger?.log(`Updated ${PHASE_NAME}`);
    return;
  }

  const added = xcodeProject.addBuildPhase(
    [],
    'PBXShellScriptBuildPhase',
    PHASE_NAME,
    clipTargetUuid,
    {
      shellPath: '/bin/sh',
      shellScript: ':',
      inputPaths: [],
      outputPaths: [],
    }
  );
  applyPhaseFields(added.buildPhase, shellScript);
  logger?.log(`Added ${PHASE_NAME}`);
}
