import { resolveNativeUnlink } from '../../../plugin/build/resolveExcludedPackages';
import type { CheckResult, ProjectContext } from '../types';

const RN_NATIVE_TYPES = new Set([
  'share',
  'action',
  'clip',
  'messages',
  'notification-content',
]);

export function nativeUnlinkSummaries(ctx: ProjectContext): string[] {
  const lines: string[] = [];

  for (const target of ctx.targets) {
    const { type, entry, name, excludedPackages, linkedPackages, ios } =
      target.config;
    if (!(entry && type && RN_NATIVE_TYPES.has(type))) {
      continue;
    }
    const resolved = resolveNativeUnlink({
      type,
      entry,
      excludedPackages,
      linkedPackages,
      nativeLink: ios?.nativeLink,
      projectRoot: ctx.projectRoot,
    });
    if (!resolved) {
      continue;
    }
    const targetLabel = name ?? target.dirName;
    lines.push(
      `Native unlink (${targetLabel}): ${resolved.packages.length} packages`
    );
  }

  return lines;
}

/** Invert is default. Unused-host warnings are no longer emitted. */
export function warnHeavyExclusions(_ctx: ProjectContext): CheckResult[] {
  return [];
}
