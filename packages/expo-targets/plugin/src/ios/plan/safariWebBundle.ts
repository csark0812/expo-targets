import path from 'node:path';

import * as Paths from '../utils/paths';
import type {
  IOSTargetProps,
  ProjectPaths,
  SafariWebBundlePlan,
  TargetIdentity,
} from './types';

/**
 * Plan an Xcode shell phase that exports the Safari RN Web entry into sealed
 * `Resources/popup.js` before the appex is packaged.
 */
export function planSafariWebBundle(
  props: IOSTargetProps,
  paths: ProjectPaths,
  identity: TargetIdentity
): SafariWebBundlePlan | undefined {
  if (props.type !== 'safari' || !props.entry) {
    return;
  }

  const entryFile = props.entry.replace(/^\.\//, '');
  const popupJsPath = Paths.getSafariPopupJsPath({
    platformProjectRoot: paths.platformProjectRoot,
    projectName: paths.projectName,
    productName: identity.targetProductName,
  });

  return {
    entryFile,
    popupJsPath,
    popupJsReferencePath: path.relative(paths.platformProjectRoot, popupJsPath),
  };
}
