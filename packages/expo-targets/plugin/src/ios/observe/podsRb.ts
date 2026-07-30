import path from 'node:path';

import * as File from '../utils/file';

/**
 * Read a target's optional `pods.rb`, which lets users add CocoaPods
 * dependencies to a single target. Format-compatible with @bacons/apple-targets.
 */
export function readPodsRb({
  projectRoot,
  targetDirectory,
}: {
  projectRoot: string;
  targetDirectory?: string;
}): string | undefined {
  if (!targetDirectory) {
    return;
  }

  return File.readFileIfExists(
    path.join(projectRoot, targetDirectory, 'ios', 'pods.rb')
  );
}
