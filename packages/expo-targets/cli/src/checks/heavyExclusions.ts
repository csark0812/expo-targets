import {
  collectImportsFromEntry,
  HEAVY_EXCLUSION_CANDIDATES,
  readPackageDeps,
} from '../../../plugin/build/entryGraph';
import { resolveExcludedPackages } from '../../../plugin/build/resolveExcludedPackages';
import type { CheckResult, ProjectContext } from '../types';

export { HEAVY_EXCLUSION_CANDIDATES };

const RN_NATIVE_TYPES = new Set([
  'share',
  'action',
  'clip',
  'messages',
  'notification-content',
]);

function findUnusedHeavyCandidates(opts: {
  deps: Set<string>;
  imported: Set<string>;
  resolved: Set<string>;
}): string[] {
  const unused: string[] = [];
  for (const candidate of HEAVY_EXCLUSION_CANDIDATES) {
    if (!opts.deps.has(candidate)) continue;
    if (opts.imported.has(candidate)) continue;
    if (opts.resolved.has(candidate)) continue;
    unused.push(candidate);
  }
  return unused;
}

function warnTargetHeavyExclusions(
  ctx: ProjectContext,
  target: ProjectContext['targets'][number],
  deps: Set<string>
): CheckResult | null {
  const { type, entry, name, excludedPackages } = target.config;
  if (!(entry && type && RN_NATIVE_TYPES.has(type))) {
    return null;
  }

  const resolved = new Set(
    resolveExcludedPackages({
      type,
      entry,
      excludedPackages,
      projectRoot: ctx.projectRoot,
    }) ?? []
  );
  const imported = collectImportsFromEntry(ctx.projectRoot, entry);
  const targetLabel = name ?? target.dirName;
  const unused = findUnusedHeavyCandidates({ deps, imported, resolved });

  if (unused.length === 0) {
    return null;
  }

  return {
    ok: false,
    level: 'warn',
    title: 'Heavy exclusions',
    message: `Target "${targetLabel}": host depends on ${unused.join(', ')} but ${unused.length === 1 ? 'it is' : 'they are'} not imported from ${entry}`,
    fix: `Add ${unused.map((p) => `"${p}"`).join(', ')} to excludedPackages to shrink the nested ExpoModulesProvider`,
  };
}

export function warnHeavyExclusions(ctx: ProjectContext): CheckResult[] {
  const deps = readPackageDeps(ctx.projectRoot);
  const warnings: CheckResult[] = [];

  for (const target of ctx.targets) {
    const warning = warnTargetHeavyExclusions(ctx, target, deps);
    if (warning) {
      warnings.push(warning);
    }
  }

  return warnings;
}
