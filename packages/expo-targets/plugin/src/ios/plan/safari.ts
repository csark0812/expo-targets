import path from 'node:path';

import type { TargetWorkspace } from '../observe/workspace';
import type { IOSTargetProps, SafariResourcesPlan } from './types';

/**
 * Safari web extensions ship a `Resources` folder (popup, manifest, background
 * script). Users can provide their own; otherwise the plugin generates one for
 * React Native Web. Only planned when the target renders through an entry.
 */
export function planSafariResources({
  workspace,
  props,
}: {
  workspace: TargetWorkspace;
  props: IOSTargetProps;
}): SafariResourcesPlan | undefined {
  if (!(props.type === 'safari' && props.entry)) {
    return;
  }

  return {
    resourcesPath: path.join(workspace.targetBuildPath, 'Resources'),
    useCustomResources: workspace.hasCustomSafariResources,
    userResourcesPath: workspace.userSafariResourcesPath,
    name: props.name,
    displayName: props.displayName,
    manifest: props.manifest,
  };
}
