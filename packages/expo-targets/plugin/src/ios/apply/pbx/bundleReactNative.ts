import type { XcodeProject } from "@expo/config-plugins";

import type { Logger } from "../../../logger";
import type { BundleReactNativePlan } from "../../plan/types";

const PHASE_NAME = "Bundle React Native code and images";

/**
 * Shell phase for RN extension/clip targets. Mirrors the Expo host script, but
 * pins `ENTRY_FILE` to this target's entry so Release embeds the correct
 * `main.jsbundle` into the appex (not the host app entry).
 */
export function buildExtensionBundleShellScript(entryFile: string): string {
  // entryFile is project-root relative; keep it free of shell metacharacters.
  const safeEntry = entryFile.replace(/"/g, "");
  return `if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
  source "$PODS_ROOT/../.xcode.env"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

# The project root by default is one level up from the ios directory
export PROJECT_ROOT="$PROJECT_DIR"/..

# Pin this target's JS entry (not the host app entry).
export ENTRY_FILE="$PROJECT_ROOT/${safeEntry}"

if [[ "$CONFIGURATION" = *Debug* ]]; then
  export SKIP_BUNDLING=1
fi

if [[ -z "$CLI_PATH" ]]; then
  # Use Expo CLI
  export CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
fi
if [[ -z "$BUNDLE_COMMAND" ]]; then
  # Default Expo CLI command for bundling
  export BUNDLE_COMMAND="export:embed"
fi

# Source .xcode.env.updates if it exists to allow
# SKIP_BUNDLING to be unset if needed
if [[ -f "$PODS_ROOT/../.xcode.env.updates" ]]; then
  source "$PODS_ROOT/../.xcode.env.updates"
fi
# Source local changes to allow overrides
# if needed
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi

\`"$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'"\`
`;
}

/** Quote a string the way Expo writes host Bundle RN phases (single-line + \\n). */
function toPbxString(value: string): string {
  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")}"`;
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
    return undefined;
  }

  const quoted = `"${phaseName}"`;
  for (const ref of target.buildPhases) {
    const phase = section[ref.value];
    if (!phase) continue;
    if (phase.name === phaseName || phase.name === quoted) {
      return { uuid: ref.value, phase };
    }
  }
  return undefined;
}

function applyPhaseFields(phase: any, shellScript: string): void {
  phase.name = `"${PHASE_NAME}"`;
  phase.shellPath = "/bin/sh";
  phase.shellScript = toPbxString(shellScript);
  phase.alwaysOutOfDate = 1;
  phase.inputPaths = [
    '"$(SRCROOT)/.xcode.env"',
    '"$(SRCROOT)/.xcode.env.local"',
  ];
  phase.outputPaths = [];
  phase.runOnlyForDeploymentPostprocessing = 0;
}

/**
 * Ensure the target has an idempotent Bundle RN shell phase for `plan`.
 */
export function ensureBundleReactNativePhase({
  project,
  targetUuid,
  plan,
  logger,
}: {
  project: XcodeProject;
  targetUuid: string;
  plan: BundleReactNativePlan;
  logger?: Logger;
}): void {
  const xcodeProject = project as any;
  const shellScript = buildExtensionBundleShellScript(plan.entryFile);
  const existing = findShellScriptPhase({
    project,
    targetUuid,
    phaseName: PHASE_NAME,
  });

  if (existing) {
    applyPhaseFields(existing.phase, shellScript);
    logger?.log(`Updated ${PHASE_NAME} for entry ${plan.entryFile}`);
    return;
  }

  // Create the phase shell, then overwrite fields so quoting matches Expo host.
  const { buildPhase } = xcodeProject.addBuildPhase(
    [],
    "PBXShellScriptBuildPhase",
    PHASE_NAME,
    targetUuid,
    {
      shellPath: "/bin/sh",
      shellScript: ":",
      inputPaths: [],
      outputPaths: [],
    },
  );
  applyPhaseFields(buildPhase, shellScript);
  logger?.log(`Added ${PHASE_NAME} for entry ${plan.entryFile}`);
}
