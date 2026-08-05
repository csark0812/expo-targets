import type { XcodeProject } from '@expo/config-plugins';

import type { Logger } from '../../../logger';
import type { SafariWebBundlePlan } from '../../plan/types';

const PHASE_NAME = 'Export Safari Web Bundle';

function toPbxString(value: string): string {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')}"`;
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

function applyPhaseFields(
  phase: any,
  shellScript: string,
  plan: SafariWebBundlePlan
): void {
  phase.name = `"${PHASE_NAME}"`;
  phase.shellPath = '/bin/sh';
  phase.shellScript = toPbxString(shellScript);
  phase.alwaysOutOfDate = 1;
  phase.inputPaths = [
    `"$(SRCROOT)/${plan.entryFile}"`,
    '"$(SRCROOT)/.xcode.env"',
    '"$(SRCROOT)/.xcode.env.local"',
  ];
  phase.outputPaths = [`"$(SRCROOT)/${plan.popupJsReferencePath}"`];
  phase.runOnlyForDeploymentPostprocessing = 0;
}

/**
 * Shell phase that invokes the expo-targets Safari web export helper.
 */
export function buildSafariWebBundleShellScript(
  plan: SafariWebBundlePlan
): string {
  const safeEntry = plan.entryFile.replace(/"/g, '');
  const safePopup = plan.popupJsReferencePath.replace(/"/g, '');
  return `if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
  source "$PODS_ROOT/../.xcode.env"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

export PROJECT_ROOT="$PROJECT_DIR"/..

if [[ "$SKIP_SAFARI_EXPORT" = "1" ]]; then
  echo "expo-targets: SKIP_SAFARI_EXPORT=1, skipping Safari web export"
  exit 0
fi

if [[ -z "$NODE_BINARY" ]]; then
  export NODE_BINARY=node
fi

SCRIPT="$("$NODE_BINARY" --print "require.resolve('expo-targets/package.json')")"
SCRIPT="\${SCRIPT%/package.json}/bin/export-safari-bundle.js"

"$NODE_BINARY" "$SCRIPT" \\
  --project-root "$PROJECT_ROOT" \\
  --entry "$PROJECT_ROOT/${safeEntry}" \\
  --popup "$PROJECT_DIR/${safePopup}"
`;
}

/** Ensure the target has an idempotent Safari web export shell phase. */
export function ensureSafariWebBundlePhase({
  project,
  targetUuid,
  plan,
  logger,
}: {
  project: XcodeProject;
  targetUuid: string;
  plan: SafariWebBundlePlan;
  logger?: Logger;
}): void {
  const xcodeProject = project as any;
  const shellScript = buildSafariWebBundleShellScript(plan);
  const existing = findShellScriptPhase({
    project,
    targetUuid,
    phaseName: PHASE_NAME,
  });

  if (existing) {
    applyPhaseFields(existing.phase, shellScript, plan);
    logger?.log(`Updated ${PHASE_NAME} for entry ${plan.entryFile}`);
    return;
  }

  const { buildPhase } = xcodeProject.addBuildPhase(
    [],
    'PBXShellScriptBuildPhase',
    PHASE_NAME,
    targetUuid,
    {
      shellPath: '/bin/sh',
      shellScript: ':',
      inputPaths: [],
      outputPaths: [],
    }
  );
  applyPhaseFields(buildPhase, shellScript, plan);
  logger?.log(`Added ${PHASE_NAME} for entry ${plan.entryFile}`);
}
