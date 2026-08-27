/**
 * Reading target blocks back out of a Podfile.
 *
 * The plugin has to post-process the Podfile it just wrote (framework search
 * paths for React Native extensions, deployment targets for standalone ones),
 * which means re-discovering every extension target already in the file.
 */

export interface PodfileTargetRef {
  targetName: string;
  deploymentTarget: string;
}

export interface ExcludedPackagesTargetRef {
  targetName: string;
  packages: string[];
}

const NESTED_TARGET_START = /^\s+target\s+'([^']+)'\s+do/;
const PLATFORM_LINE = /platform\s+:ios,\s+'([^']+)'/;
const STANDALONE_TARGET =
  /target\s+'([^']+)'\s+do\s+platform\s+:ios,\s+'([^']+)'/g;
/** Keep in sync with EXCLUDED_PACKAGES_MARKER in podfile.ts */
const EXCLUDED_PACKAGES_LINE =
  /# \[expo-targets-excluded-packages-list\]\s*(.+)/;

/**
 * The main target's block, up to the `post_install` hook when there is one.
 */
function mainTargetBody(
  podfile: string,
  mainTargetName: string
): string | undefined {
  const start = podfile.indexOf(`target '${mainTargetName}' do`);
  if (start < 0) {
    return;
  }

  const postInstallStart = podfile.indexOf('post_install do', start);
  return postInstallStart >= 0
    ? podfile.substring(start, postInstallStart)
    : podfile.substring(start);
}

/** How much a line changes the Ruby block nesting depth. */
function depthDelta(line: string): number {
  return (/\bdo\b/.test(line) ? 1 : 0) - (/\bend\b/.test(line) ? 1 : 0);
}

/**
 * Split the main target's body into the target blocks nested inside it.
 */
function nestedTargetBlocks(
  body: string,
  mainTargetName: string
): { name: string; block: string }[] {
  const blocks: { name: string; block: string }[] = [];
  let open: { name: string; lines: string[]; depth: number } | undefined;

  for (const line of body.split('\n')) {
    const start = line.match(NESTED_TARGET_START);
    if (start && start[1] !== mainTargetName) {
      open = { name: start[1], lines: [line], depth: 1 };
      continue;
    }

    if (!open) {
      continue;
    }

    open.lines.push(line);
    open.depth += depthDelta(line);
    if (open.depth === 0) {
      blocks.push({ name: open.name, block: open.lines.join('\n') });
      open = undefined;
    }
  }

  return blocks;
}

/**
 * React Native extension targets nested in the main target. They use
 * `inherit! :search_paths` so they don't pull in incompatible pods like Expo,
 * which is also why they need extra framework search paths afterwards.
 */
export function findReactNativeExtensionTargets(
  podfile: string,
  {
    mainTargetName,
    fallbackDeploymentTarget,
  }: { mainTargetName: string; fallbackDeploymentTarget: string }
): PodfileTargetRef[] {
  const body = mainTargetBody(podfile, mainTargetName);
  if (!body) {
    return [];
  }

  return nestedTargetBlocks(body, mainTargetName)
    .filter(({ block }) => block.includes('inherit! :search_paths'))
    .map(({ name, block }) => ({
      targetName: name,
      deploymentTarget:
        block.match(PLATFORM_LINE)?.[1] || fallbackDeploymentTarget,
    }));
}

/**
 * Nested RN targets that declare `excludedPackages` via the marker comment.
 * Used to rebuild the `post_integrate` strip hook after each target apply.
 */
export function findExcludedPackagesTargets(
  podfile: string,
  mainTargetName: string
): ExcludedPackagesTargetRef[] {
  const body = mainTargetBody(podfile, mainTargetName);
  if (!body) {
    return [];
  }

  return nestedTargetBlocks(body, mainTargetName)
    .filter(({ block }) => block.includes('inherit! :search_paths'))
    .map(({ name, block }) => {
      const match = block.match(EXCLUDED_PACKAGES_LINE);
      const packages = (match?.[1] ?? '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      return { targetName: name, packages };
    })
    .filter((t) => t.packages.length > 0);
}

/**
 * Standalone extension targets: siblings of the main target that declare their
 * own platform on the line right after `do`.
 */
export function findStandaloneExtensionTargets(
  podfile: string,
  mainTargetName: string
): PodfileTargetRef[] {
  const targets: PodfileTargetRef[] = [];
  const pattern = new RegExp(STANDALONE_TARGET.source, 'g');
  let match = pattern.exec(podfile);

  while (match !== null) {
    const [, targetName, deploymentTarget] = match;
    if (targetName !== mainTargetName) {
      targets.push({ targetName, deploymentTarget });
    }
    match = pattern.exec(podfile);
  }

  return targets;
}

/**
 * Highest deployment target among the given targets, so the Podfile platform
 * line can be raised to match and avoid linker errors.
 */
export function highestDeploymentTarget(
  targets: PodfileTargetRef[]
): string | undefined {
  if (targets.length === 0) {
    return;
  }

  return targets.reduce((highest, target) =>
    Number.parseFloat(target.deploymentTarget) >
    Number.parseFloat(highest.deploymentTarget)
      ? target
      : highest
  ).deploymentTarget;
}
