import path from 'node:path';

import type { TargetWorkspace } from '../observe/workspace';
import type { BundleResourcePlan, ProjectPaths } from './types';

/**
 * Non-source files that must land in Copy Bundle Resources (e.g. content
 * blocker `blockerList.json`).
 */
export function planBundleResources({
  workspace,
  paths,
}: {
  workspace: TargetWorkspace;
  paths: ProjectPaths;
}): BundleResourcePlan[] {
  return workspace.bundleResourceFiles.map((rel) => {
    const sourcePath = path.join(workspace.targetDirectory, rel);
    return {
      file: path.basename(rel),
      sourcePath,
      referencePath: path.relative(paths.platformProjectRoot, sourcePath),
    };
  });
}
