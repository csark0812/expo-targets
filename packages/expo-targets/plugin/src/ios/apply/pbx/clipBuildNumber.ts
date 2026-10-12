import type { XcodeProject } from '@expo/config-plugins';

import type { Logger } from '../../../logger';

/**
 * Retired shell phase that copied the host build number into the Clip at
 * compile time. Clips now keep their own Info.plist (no generation), so the
 * CFBundleVersion EAS writes into it survives; drop the phase from projects
 * prebuilt by older versions.
 */
const RETIRED_PHASE_NAME = '[expo-targets] Sync App Clip CFBundleVersion';

export function removeClipBuildNumberPhase({
  project,
  clipTargetUuid,
  logger,
}: {
  project: XcodeProject;
  clipTargetUuid: string;
  logger?: Logger;
}): void {
  const objects = (project as any).hash.project.objects;
  const target = objects.PBXNativeTarget?.[clipTargetUuid];
  const section = objects.PBXShellScriptBuildPhase;
  if (!(target?.buildPhases && section)) {
    return;
  }

  const names = new Set([RETIRED_PHASE_NAME, `"${RETIRED_PHASE_NAME}"`]);
  const retired = target.buildPhases
    .map((ref: { value: string }) => ref.value)
    .filter((uuid: string) => names.has(section[uuid]?.name));
  if (retired.length === 0) {
    return;
  }

  target.buildPhases = target.buildPhases.filter(
    (ref: { value: string }) => !retired.includes(ref.value)
  );
  for (const uuid of retired) {
    delete section[uuid];
    delete section[`${uuid}_comment`];
  }
  logger?.log(`Removed ${RETIRED_PHASE_NAME}`);
}
