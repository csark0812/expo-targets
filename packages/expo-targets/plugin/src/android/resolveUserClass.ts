import * as fs from 'node:fs';
import * as path from 'node:path';
import { sanitizeTargetSegment, toPascalName } from './activationMime';

/**
 * Prefer user deepen under targets/<name>/android/<pkg>/target/<segment>/<File>.kt
 * else return libraryDefault FQCN.
 */
export function resolveUserOrLibraryClass(options: {
  packageName: string;
  projectRoot: string;
  directory: string;
  targetName: string;
  fileBaseName: string;
  libraryDefault: string;
}): string {
  const segment = sanitizeTargetSegment(options.targetName);
  const userClass = `${options.packageName}.target.${segment}.${options.fileBaseName}`;
  const userPath = path.join(
    options.projectRoot,
    options.directory,
    'android',
    ...options.packageName.split('.'),
    'target',
    segment,
    `${options.fileBaseName}.kt`
  );
  if (fs.existsSync(userPath)) {
    return userClass;
  }
  return options.libraryDefault;
}

export function deepenClassBaseName(
  targetName: string,
  suffix: string
): string {
  return `${toPascalName(targetName)}${suffix}`;
}
