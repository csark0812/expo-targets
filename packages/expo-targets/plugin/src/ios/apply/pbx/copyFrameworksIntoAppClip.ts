import type { XcodeProject } from '@expo/config-plugins';

import type { Logger } from '../../../logger';

const PHASE_NAME = '[expo-targets] Copy Frameworks into App Clip';

/** Quote a string the way Expo writes host shell phases (single-line + \\n). */
function toPbxString(value: string): string {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')}"`;
}

/**
 * Host post-embed script: RN App Clips link Expo/RN via @rpath but CocoaPods
 * only embeds frameworks into the host (`inherit! :search_paths` on the clip).
 * App Clips are separate processes, so copy host Frameworks into the nested
 * AppClips/*.app after both products exist.
 */
export function buildCopyFrameworksIntoAppClipScript(
  clipProductName: string
): string {
  const safe = clipProductName.replace(/"/g, '').replace(/\.app$/i, '');
  return `set -euo pipefail
HOST_APP="\${TARGET_BUILD_DIR}/\${FULL_PRODUCT_NAME}"
CLIP_APP="\${HOST_APP}/AppClips/${safe}.app"
HOST_FW="\${HOST_APP}/Frameworks"
CLIP_FW="\${CLIP_APP}/Frameworks"

# CocoaPods may schedule [CP] Embed Pods Frameworks after this phase — run
# the host embed script first so Frameworks exist before we copy.
EMBED_SH=\$(ls "\$PODS_ROOT/Target Support Files"/Pods-*/Pods-*-frameworks.sh 2>/dev/null | grep -v '${safe}' | head -1 || true)
if [[ -n "\${EMBED_SH:-}" && -f "\$EMBED_SH" ]]; then
  export FRAMEWORKS_FOLDER_PATH="\${FULL_PRODUCT_NAME}/Frameworks"
  /bin/sh "\$EMBED_SH" || true
fi

if [[ ! -d "\$HOST_FW" ]]; then
  echo "note: no host Frameworks at \$HOST_FW — skip App Clip framework copy"
  exit 0
fi
if [[ ! -d "\$CLIP_APP" ]]; then
  echo "warning: App Clip missing at \$CLIP_APP — skip framework copy"
  exit 0
fi
mkdir -p "\$CLIP_FW"
rsync -a "\$HOST_FW/" "\$CLIP_FW/"
echo "Copied host Frameworks into \$CLIP_FW"

# Sibling product (BUILT_PRODUCTS_DIR/${safe}.app) is what Xcode/simctl
# install when launching the App Clip scheme — keep it in sync too.
SIBLING_APP="\${BUILT_PRODUCTS_DIR}/${safe}.app"
if [[ -d "\$SIBLING_APP" && "\$SIBLING_APP" != "\$CLIP_APP" ]]; then
  mkdir -p "\$SIBLING_APP/Frameworks"
  rsync -a "\$HOST_FW/" "\$SIBLING_APP/Frameworks/"
  echo "Copied host Frameworks into \$SIBLING_APP/Frameworks"
fi

# Re-apply JS bundle after Embed App Clips (Create .app can drop it).
copy_jsbundle() {
  local dest="\$1"
  if [[ -f "\$dest/main.jsbundle" ]]; then
    return 0
  fi
  for candidate in \\
    "\${CONFIGURATION_BUILD_DIR}/${safe}-main.jsbundle" \\
    "\${BUILT_PRODUCTS_DIR}/${safe}-main.jsbundle" \\
    "\${TARGET_BUILD_DIR}/${safe}.app/main.jsbundle" \\
    "\${BUILT_PRODUCTS_DIR}/${safe}.app/main.jsbundle" \\
    "\$CLIP_APP/main.jsbundle"
  do
    if [[ -f "\$candidate" ]]; then
      cp "\$candidate" "\$dest/main.jsbundle"
      echo "Copied JS bundle from \$candidate → \$dest"
      return 0
    fi
  done
  return 1
}
copy_jsbundle "\$CLIP_APP" || echo "warning: no main.jsbundle for nested App Clip"
if [[ -d "\${SIBLING_APP:-}" ]]; then
  copy_jsbundle "\$SIBLING_APP" || true
fi
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

/**
 * Idempotent host shell phase: copy Frameworks into AppClips/<clip>.app.
 * Only needed for React Native App Clips (dynamic @rpath Expo/RN frameworks).
 */
export function ensureCopyFrameworksIntoAppClipPhase({
  project,
  mainTargetUuid,
  clipProductName,
  logger,
}: {
  project: XcodeProject;
  mainTargetUuid: string;
  clipProductName: string;
  logger?: Logger;
}): void {
  const xcodeProject = project as any;
  const shellScript = buildCopyFrameworksIntoAppClipScript(clipProductName);
  const existing = findShellScriptPhase({
    project,
    targetUuid: mainTargetUuid,
    phaseName: PHASE_NAME,
  });

  if (existing) {
    applyPhaseFields(existing.phase, shellScript);
    movePhaseToEnd({
      project: xcodeProject,
      targetUuid: mainTargetUuid,
      phaseUuid: existing.uuid,
    });
    logger?.log(`Updated ${PHASE_NAME} for ${clipProductName}`);
    return;
  }

  const added = xcodeProject.addBuildPhase(
    [],
    'PBXShellScriptBuildPhase',
    PHASE_NAME,
    mainTargetUuid,
    {
      shellPath: '/bin/sh',
      shellScript: ':',
      inputPaths: [],
      outputPaths: [],
    }
  );
  applyPhaseFields(added.buildPhase, shellScript);
  // Must run after CocoaPods embeds frameworks into the host .app.
  const phaseUuid =
    added.uuid ??
    findShellScriptPhase({
      project,
      targetUuid: mainTargetUuid,
      phaseName: PHASE_NAME,
    })?.uuid;
  if (phaseUuid) {
    movePhaseToEnd({
      project: xcodeProject,
      targetUuid: mainTargetUuid,
      phaseUuid,
    });
  }
  logger?.log(`Added ${PHASE_NAME} for ${clipProductName}`);
}

function movePhaseToEnd({
  project,
  targetUuid,
  phaseUuid,
}: {
  project: any;
  targetUuid: string;
  phaseUuid: string;
}): void {
  const target = project.hash.project.objects.PBXNativeTarget[targetUuid];
  if (!target?.buildPhases) return;
  const phases = target.buildPhases as { value: string; comment?: string }[];
  const idx = phases.findIndex((p) => p.value === phaseUuid);
  if (idx < 0 || idx === phases.length - 1) return;
  const [phase] = phases.splice(idx, 1);
  phases.push(phase!);
}

/**
 * CocoaPods appends `[CP] Embed Pods Frameworks` after prebuild — inject this
 * into `post_install` so the copy phase stays last.
 */
export function buildReorderAppClipFrameworksCopyPhaseRuby(
  mainTargetName: string
): string {
  const safe = mainTargetName.replace(/'/g, "\\'");
  return `
    # [expo-targets] Keep App Clip framework-copy after CocoaPods embed.
    begin
      require 'xcodeproj'
      project_path = Dir.glob('*.xcodeproj').first
      if project_path
        project = Xcodeproj::Project.open(project_path)
        target = project.targets.find { |t| t.name == '${safe}' }
        phase_name = '[expo-targets] Copy Frameworks into App Clip'
        if target
          phase = target.shell_script_build_phases.find { |p| p.name == phase_name }
          if phase
            target.build_phases.delete(phase)
            target.build_phases << phase
            project.save
          end
        end
      end
    rescue => e
      Pod::UI.puts "[expo-targets] skip App Clip phase reorder: #{e}"
    end
`;
}
