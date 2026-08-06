import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import type { ConfigPlugin } from '@expo/config-plugins';
import { withAppBuildGradle } from '@expo/config-plugins';

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

    let contents = cfg.modResults.contents;
    const srcPattern =
      /(sourceSets\s*\{[^}]*main\s*\{[^}]*java\.srcDirs\s*\+=\s*\[)([^\]]*)(\])/s;
    const srcMatch = contents.match(srcPattern);
    if (srcMatch && !srcMatch[2].includes(`'${relativePath}'`)) {
      contents = contents.replace(
        srcPattern,
        `$1$2, '${relativePath}'$3`
      );
    } else if (
      !srcMatch &&
      !contents.includes(`java.srcDirs += ['${relativePath}']`)
    ) {
      // Fallback: append a sourceSets block if none matched
      contents += `

android {
    sourceSets {
        main {
            java.srcDirs += ['${relativePath}']
        }
    }
}
`;
    }

    const resPath = `${relativePath}/res`;
    if (
      fs.existsSync(path.join(androidDir, 'res')) &&
      !contents.includes(`'${resPath}'`)
    ) {
      const resPattern =
        /(sourceSets\s*\{[^}]*main\s*\{[^}]*res\.srcDirs\s*\+=\s*\[)([^\]]*)(\])/s;
      if (resPattern.test(contents)) {
        contents = contents.replace(resPattern, (full, prefix, dirs, suffix) => {
          if (dirs.includes(`'${resPath}'`)) return full;
          return `${prefix}${dirs}, '${resPath}'${suffix}`;
        });
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
