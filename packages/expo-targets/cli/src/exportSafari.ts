import path from 'node:path';
import process from 'node:process';

import { getProjectName } from '../../plugin/build/ios/apply/pbx';
import { exportSafariWebBundle } from '../../plugin/build/ios/safari/exportSafariWebBundle';
import { sanitizeTargetName } from '../../plugin/build/ios/utils/paths';

import { loadProject } from './project';

export function runExportSafari(projectRoot = process.cwd()): number {
  if (process.env.SKIP_SAFARI_EXPORT === '1') {
    console.log('SKIP_SAFARI_EXPORT=1, skipping Safari web export');
    return 0;
  }

  const ctx = loadProject(projectRoot);
  const platformProjectRoot = path.join(projectRoot, 'ios');
  const projectName = getProjectName(platformProjectRoot);
  const targets = ctx.targets.filter(
    (target) => target.config.type === 'safari' && target.config.entry
  );

  if (targets.length === 0) {
    console.log('No safari targets with entry found');
    return 0;
  }

  for (const target of targets) {
    const displayName =
      target.config.displayName || target.config.name || target.dirName;
    const productName = sanitizeTargetName(displayName);
    const entryFile = target.config.entry!.replace(/^\.\//, '');

    const result = exportSafariWebBundle({
      projectRoot,
      platformProjectRoot,
      projectName,
      target: { entryFile, productName },
    });

    const verb = result.skipped ? 'Skipped' : 'Exported';
    console.log(
      `${verb} Safari web bundle for ${displayName} → ${result.popupJsPath}`
    );
  }

  return 0;
}
