import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export type AutolinkedNativePackage = {
  packageName: string;
  linkerTokens: string[];
};

/** Must never appear as a strip token (scoped packages often end in `react-native`). */
const CORE_LINKER_BLOCKLIST = new Set([
  'react',
  'react-native',
  'React',
  'React-Core',
  'hermes',
  'hermes-engine',
  'yoga',
  'Yoga',
  'ExpoModulesCore',
  'expo-modules-core',
  'expo-targets',
  'expo',
]);

function isBlockedLinkerToken(token: string): boolean {
  if (CORE_LINKER_BLOCKLIST.has(token)) {
    return true;
  }
  return /^(React([-_A-Z].*)?|RCT|Folly|glog|fmt|boost|Yoga|hermes)/.test(
    token
  );
}

function lastSegment(packageName: string): string {
  if (packageName.startsWith('@')) {
    const parts = packageName.split('/');
    return parts[1] ?? packageName;
  }
  return packageName.split('/')[0] ?? packageName;
}

function frameworkStem(file: string): string | undefined {
  const base = path.basename(file.trim());
  if (base.endsWith('.xcframework')) {
    return base.slice(0, -'.xcframework'.length);
  }
  if (base.endsWith('.framework')) {
    return base.slice(0, -'.framework'.length);
  }
}

/**
 * XCFramework / CocoaPod names that appear as `-framework X` on OTHER_LDFLAGS.
 * Wrapper pods (`intercom-react-native`) depend on `Intercom`; the npm name
 * does not match the linker flag.
 */
export function frameworkNamesFromPodspec(source: string): string[] {
  const names = new Set<string>();
  const dependency = /(?:^|\n)\s*(?:s|spec)\.dependency\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(dependency)) {
    const name = (match[1] ?? '').split('/')[0];
    if (name && !isBlockedLinkerToken(name)) {
      names.add(name);
    }
  }
  const vendored = /['"]([^'"]+\.(?:xcframework|framework))['"]/g;
  for (const match of source.matchAll(vendored)) {
    const stem = frameworkStem(match[1] ?? '');
    if (stem && !isBlockedLinkerToken(stem)) {
      names.add(stem);
    }
  }
  return [...names];
}

function readPodspecFrameworkNames(podspecPath: string): string[] {
  try {
    return frameworkNamesFromPodspec(fs.readFileSync(podspecPath, 'utf8'));
  } catch {
    return [];
  }
}

export function linkerTokensForPackageName(packageName: string): string[] {
  const last = lastSegment(packageName);
  if (last === packageName || CORE_LINKER_BLOCKLIST.has(last)) {
    return [packageName];
  }
  return [packageName, last];
}

function addTokens(into: Set<string>, tokens: readonly string[]): void {
  for (const token of tokens) {
    if (token) {
      into.add(token);
    }
  }
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function collectNamedStrings(items: unknown, key: string): string[] {
  if (!Array.isArray(items)) {
    return [];
  }
  const names: string[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      names.push(item);
      continue;
    }
    if (item && typeof item === 'object') {
      const name = stringField((item as Record<string, unknown>)[key]);
      if (name) {
        names.push(name);
      }
    }
  }
  return names;
}

function expoModuleToPackage(
  mod: unknown
): AutolinkedNativePackage | undefined {
  if (!mod || typeof mod !== 'object') {
    return;
  }
  const packageName = stringField(
    (mod as { packageName?: unknown }).packageName
  );
  if (!packageName) {
    return;
  }
  const tokens = new Set(linkerTokensForPackageName(packageName));
  addTokens(
    tokens,
    collectNamedStrings((mod as { pods?: unknown }).pods, 'podName')
  );
  addTokens(
    tokens,
    collectNamedStrings(
      (mod as { swiftModuleNames?: unknown }).swiftModuleNames,
      ''
    )
  );
  return { packageName, linkerTokens: [...tokens] };
}

export function parseExpoAutolinkingResolve(
  data: unknown
): AutolinkedNativePackage[] {
  if (!data || typeof data !== 'object' || !('modules' in data)) {
    return [];
  }
  const modules = (data as { modules: unknown }).modules;
  if (!Array.isArray(modules)) {
    return [];
  }
  return modules.flatMap((mod) => {
    const parsed = expoModuleToPackage(mod);
    return parsed ? [parsed] : [];
  });
}

function podspecToken(podspecPath: string): string | undefined {
  const base = path.basename(podspecPath);
  if (!base.endsWith('.podspec')) {
    return;
  }
  return base.slice(0, -'.podspec'.length);
}

function rnDepToPackage(
  packageName: string,
  value: unknown
): AutolinkedNativePackage | undefined {
  if (!value || typeof value !== 'object') {
    return;
  }
  const ios = (value as { platforms?: { ios?: unknown } }).platforms?.ios;
  if (!ios) {
    return;
  }
  const tokens = new Set(linkerTokensForPackageName(packageName));
  if (typeof ios === 'object') {
    const podspecPath =
      stringField((ios as { podspecPath?: unknown }).podspecPath) ?? '';
    const token = podspecToken(podspecPath);
    if (token) {
      tokens.add(token);
    }
    addTokens(tokens, readPodspecFrameworkNames(podspecPath));
  }
  return { packageName, linkerTokens: [...tokens] };
}

export function parseReactNativeConfig(
  data: unknown
): AutolinkedNativePackage[] {
  if (!data || typeof data !== 'object' || !('dependencies' in data)) {
    return [];
  }
  const deps = (data as { dependencies: unknown }).dependencies;
  if (!deps || typeof deps !== 'object') {
    return [];
  }
  return Object.entries(deps as Record<string, unknown>).flatMap(
    ([packageName, value]) => {
      const parsed = rnDepToPackage(packageName, value);
      return parsed ? [parsed] : [];
    }
  );
}

export function mergeAutolinkedPackages(
  lists: AutolinkedNativePackage[][]
): AutolinkedNativePackage[] {
  const map = new Map<string, Set<string>>();
  for (const list of lists) {
    for (const pkg of list) {
      const tokens = map.get(pkg.packageName) ?? new Set<string>();
      addTokens(tokens, pkg.linkerTokens);
      map.set(pkg.packageName, tokens);
    }
  }
  return [...map.entries()].map(([packageName, tokens]) => ({
    packageName,
    linkerTokens: [...tokens],
  }));
}

export function normalizeAutolinkedPackages(
  packages: readonly (string | AutolinkedNativePackage)[]
): AutolinkedNativePackage[] {
  return mergeAutolinkedPackages([
    packages.map((pkg) =>
      typeof pkg === 'string'
        ? { packageName: pkg, linkerTokens: linkerTokensForPackageName(pkg) }
        : pkg
    ),
  ]);
}

function runAutolinkingJson(
  projectRoot: string,
  args: string[]
): unknown | null {
  try {
    const cli = require.resolve(
      'expo-modules-autolinking/bin/expo-modules-autolinking.js',
      { paths: [projectRoot] }
    );
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 30_000,
    });
    if (result.status !== 0 || !result.stdout) {
      return null;
    }
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

/** Expo modules + RN community packages the host autolinks for iOS. */
export function listAutolinkedNativePackages(
  projectRoot: string
): AutolinkedNativePackage[] {
  const expo = parseExpoAutolinkingResolve(
    runAutolinkingJson(projectRoot, [
      'resolve',
      '--json',
      '--platform',
      'apple',
    ])
  );
  const rn = parseReactNativeConfig(
    runAutolinkingJson(projectRoot, [
      'react-native-config',
      '--json',
      '--platform',
      'ios',
    ])
  );
  return mergeAutolinkedPackages([expo, rn]);
}

export function linkerTokensForPackages(
  packageNames: readonly string[],
  autolinked: readonly AutolinkedNativePackage[]
): string[] {
  const byName = new Map(
    autolinked.map((pkg) => [pkg.packageName, pkg.linkerTokens])
  );
  const tokens = new Set<string>();
  for (const name of packageNames) {
    for (const token of byName.get(name) ?? linkerTokensForPackageName(name)) {
      if (!isBlockedLinkerToken(token)) {
        tokens.add(token);
      }
    }
  }
  return [...tokens];
}
