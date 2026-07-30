const xcode = require('xcode');

/**
 * Parse a project.pbxproj fixture into an in-memory `xcode` project object.
 * Mirrors how the plugin loads real Xcode projects via `IOSConfig.XcodeUtils`.
 */
export function loadPbx(pbxprojPath: string): any {
  const project = xcode.project(pbxprojPath);
  project.parseSync();
  return project;
}
