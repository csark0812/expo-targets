import * as fs from 'node:fs';
import * as path from 'node:path';

/** Heavy / host-leaning packages to auto-exclude when unused by the entry. */
export const HEAVY_EXCLUSION_CANDIDATES = [
  'react-native-reanimated',
  '@sentry/react-native',
  'react-native-screens',
  '@react-native-community/netinfo',
] as const;

const IMPORT_RE = /(?:from\s+|require\s*\(\s*)['"](@?[^'"]+)['"]/g;

export function readPackageDeps(projectRoot: string): Set<string> {
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

/** Package roots imported from `entryRel` (and local relative files). */
export function collectImportsFromEntry(
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
    let source: string;
    try {
      source = fs.readFileSync(file, 'utf8');
    } catch {
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

export function unusedHeavyPackages(opts: {
  projectRoot: string;
  entry: string;
}): string[] {
  const deps = readPackageDeps(opts.projectRoot);
  const imported = collectImportsFromEntry(opts.projectRoot, opts.entry);
  const unused: string[] = [];
  for (const candidate of HEAVY_EXCLUSION_CANDIDATES) {
    if (!deps.has(candidate)) continue;
    if (imported.has(candidate)) continue;
    unused.push(candidate);
  }
  return unused;
}
