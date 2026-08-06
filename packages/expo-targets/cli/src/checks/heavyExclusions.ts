import * as fs from 'node:fs';
import * as path from 'node:path';

import { resolveExcludedPackages } from '../../../plugin/build/resolveExcludedPackages';
import type { CheckResult, ProjectContext } from '../types';

/** Heavy / host-leaning packages worth warning about when unused by the entry. */
export const HEAVY_EXCLUSION_CANDIDATES = [
  'react-native-reanimated',
  '@sentry/react-native',
  'react-native-screens',
  '@react-native-community/netinfo',
] as const;

const RN_NATIVE_TYPES = new Set([
  'share',
  'action',
  'clip',
  'messages',
  'notification-content',
]);

const IMPORT_RE = /(?:from\s+|require\s*\(\s*)['"](@?[^'"]+)['"]/g;

function readPackageDeps(projectRoot: string): Set<string> {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return new Set();
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ]);
  } catch {
    return new Set();
  }
}

function packageRoot(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split('/')[0] ?? specifier;
}

function resolveLocal(fromDir: string, spec: string): string | null {
  const base = path.resolve(fromDir, spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return c;
    }
  }
  return null;
}

function readSourceFile(file: string): string | null {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function collectSpecifiersFromSource(opts: {
  source: string;
  file: string;
  queue: string[];
}): string[] {
  const roots: string[] = [];
  for (const match of opts.source.matchAll(IMPORT_RE)) {
    const spec = match[1];
    if (!spec) continue;
    if (spec.startsWith('.') || spec.startsWith('/')) {
      const resolved = resolveLocal(path.dirname(opts.file), spec);
      if (resolved) {
        opts.queue.push(resolved);
      }
      continue;
    }
    roots.push(packageRoot(spec));
  }
  return roots;
}

function collectImportsFromEntry(
  projectRoot: string,
  entryRel: string
): Set<string> {
  const seen = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [path.resolve(projectRoot, entryRel)];

  while (queue.length > 0) {
    const file = queue.pop();
    if (!file || visited.has(file) || !fs.existsSync(file)) {
      continue;
    }
    visited.add(file);
    const source = readSourceFile(file);
    if (!source) {
      continue;
    }
    for (const root of collectSpecifiersFromSource({
      source,
      file,
      queue,
    })) {
      seen.add(root);
    }
  }

  return seen;
}

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
