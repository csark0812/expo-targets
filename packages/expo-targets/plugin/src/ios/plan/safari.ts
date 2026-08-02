import path from 'node:path';

import type { TargetWorkspace } from '../observe/workspace';
import type { IOSTargetProps, ProjectPaths, SafariResourcesPlan } from './types';

/**
 * Safari web extensions ship a `Resources` folder (popup, manifest, background
 * script). Users can provide their own; otherwise the plugin generates one.
 * Planned for every safari target — Safari will not list an appex that lacks
 * a bundled Resources/manifest.json.
 */
export function planSafariResources({
  workspace,
  props,
  paths,
}: {
  workspace: TargetWorkspace;
  props: IOSTargetProps;
  paths: ProjectPaths;
}): SafariResourcesPlan | undefined {
  // Resources (manifest/popup) are required for Safari to list the appex,
  // whether or not a React Native Web entry exists.
  if (props.type !== 'safari') {
    return;
  }

  const resourcesPath = path.join(workspace.targetBuildPath, 'Resources');
  return {
    resourcesPath,
    referencePath: path.relative(paths.platformProjectRoot, resourcesPath),
    useCustomResources: workspace.hasCustomSafariResources,
    userResourcesPath: workspace.userSafariResourcesPath,
    name: props.name,
    displayName: props.displayName,
    manifest: props.manifest,
  };
}
