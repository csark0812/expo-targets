import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import type { ConfigPlugin } from '@expo/config-plugins';
import { withAppBuildGradle } from '@expo/config-plugins';

function appendJavaSrcDir(contents: string, relativePath: string): string {
  const srcPattern =
    /(sourceSets\s*\{[^}]*main\s*\{[^}]*java\.srcDirs\s*\+=\s*\[)([^\]]*)(\])/s;
  const srcMatch = contents.match(srcPattern);
  if (srcMatch && !srcMatch[2].includes(`'${relativePath}'`)) {
    return contents.replace(srcPattern, `$1$2, '${relativePath}'$3`);
  }
  if (srcMatch || contents.includes(`java.srcDirs += ['${relativePath}']`)) {
    return contents;
  }
  return `${contents}

android {
    sourceSets {
        main {
            java.srcDirs += ['${relativePath}']
        }
    }
}
`;
}

function appendResSrcDir(contents: string, resPath: string): string {
  const resPattern =
    /(sourceSets\s*\{[^}]*main\s*\{[^}]*res\.srcDirs\s*\+=\s*\[)([^\]]*)(\])/s;
  const match = contents.match(resPattern);
  if (!match || match[2].includes(`'${resPath}'`)) {
    return contents;
  }
  return contents.replace(resPattern, `$1$2, '${resPath}'$3`);
}

/**
 * Adds `targets/<name>/android` as a java/res source set (widget + future types).
 * Generalizes the widget-only helper for Wave 0+.
 */
export const withAndroidTargetSourceSets: ConfigPlugin<{
  directory: string;
}> = (config, props) => {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      return cfg;
    }

    const projectRoot = cfg._internal?.projectRoot || process.cwd();
    const androidDir = path.join(projectRoot, props.directory, 'android');
    if (!fs.existsSync(androidDir)) {
      return cfg;
    }

    const platformProjectRoot = path.join(projectRoot, 'android');
    const relativePath = path
      .relative(path.join(platformProjectRoot, 'app'), androidDir)
      .replace(/\\/g, '/');

    let contents = appendJavaSrcDir(cfg.modResults.contents, relativePath);

    const resPath = `${relativePath}/res`;
    if (fs.existsSync(path.join(androidDir, 'res'))) {
      contents = appendResSrcDir(contents, resPath);
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
