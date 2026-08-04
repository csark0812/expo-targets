import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';

interface WidgetSourceSetProps {
  directory: string;
}

interface WidgetSourceSetContext {
  projectRoot: string;
  widgetAndroidDir: string;
  relativePath: string;
  layoutsPath: string;
  resPath: string;
  hasUserLayouts: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getWidgetSourceSetContext(
  config: any,
  props: WidgetSourceSetProps
): WidgetSourceSetContext | null {
  const projectRoot = config._internal?.projectRoot || process.cwd();
  const widgetAndroidDir = path.join(projectRoot, props.directory, 'android');

  if (!fs.existsSync(widgetAndroidDir)) {
    return null;
  }

  const platformProjectRoot = path.join(projectRoot, 'android');
  const relativePath = path
    .relative(path.join(platformProjectRoot, 'app'), widgetAndroidDir)
    .replace(/\\/g, '/');
  const layoutsPath = `${relativePath}/layouts`;
  const resPath = `${relativePath}/res`;
  const layoutsDir = path.join(projectRoot, props.directory, 'android/layouts');
  const hasUserLayouts = fs.existsSync(layoutsDir);

  return {
    projectRoot,
    widgetAndroidDir,
    relativePath,
    layoutsPath,
    resPath,
    hasUserLayouts,
  };
}

function isWidgetSourceSetAlreadyAdded(
  contents: string,
  relativePath: string
): boolean {
  const widgetSourceSetPattern = new RegExp(
    `java\\.srcDirs\\s*\\+=\\s*\\['${escapeRegex(relativePath)}'\\]`,
    's'
  );
  return widgetSourceSetPattern.test(contents);
}

interface ResDirsUpdateOptions {
  existingDirs: string;
  resPath: string;
  layoutsPath: string;
  hasUserLayouts: boolean;
}

function appendJavaSrcDir(contents: string, relativePath: string): string {
  const pattern =
    /(sourceSets\s*\{[^}]*main\s*\{[^}]*java\.srcDirs\s*\+=\s*\[)([^\]]*)(\])/s;
  const match = contents.match(pattern);
  if (!match) {
    return contents;
  }
  const [, prefix, existingDirs, suffix] = match;
  if (existingDirs.includes(`'${relativePath}'`)) {
    return contents;
  }
  return contents.replace(
    pattern,
    `${prefix}${existingDirs}, '${relativePath}'${suffix}`
  );
}

function updateResDirsEntry(options: ResDirsUpdateOptions): string {
  const { existingDirs, resPath, layoutsPath, hasUserLayouts } = options;
  let updated = existingDirs;
  if (!existingDirs.includes(`'${resPath}'`)) {
    updated = updated ? `${updated}, '${resPath}'` : `'${resPath}'`;
  }
  if (hasUserLayouts && !existingDirs.includes(`'${layoutsPath}'`)) {
    updated = updated ? `${updated}, '${layoutsPath}'` : `'${layoutsPath}'`;
  }
  return updated;
}

function appendResSrcDirs(
  contents: string,
  context: Pick<
    WidgetSourceSetContext,
    'resPath' | 'layoutsPath' | 'hasUserLayouts'
  >
): string {
  const pattern =
    /(sourceSets\s*\{[^}]*main\s*\{[^}]*res\.srcDirs\s*\+=\s*\[)([^\]]*)(\])/s;
  const match = contents.match(pattern);
  if (!match) {
    return contents;
  }
  const [, prefix, existingDirs, suffix] = match;
  const updated = updateResDirsEntry({ existingDirs, ...context });
  if (updated === existingDirs) {
    return contents;
  }
  return contents.replace(pattern, `${prefix}${updated}${suffix}`);
}

function addJavaAndResSrcDirs(
  contents: string,
  relativePath: string,
  resDirs: string
): string {
  return contents.replace(
    /(sourceSets\s*\{[^}]*main\s*\{)([^}]*)(\})/s,
    `$1$2            java.srcDirs += ['${relativePath}']\n            res.srcDirs += ${resDirs}\n$3`
  );
}

function addResSrcDirsAfterJava(contents: string, resDirs: string): string {
  return contents.replace(
    /(java\.srcDirs\s*\+=\s*\[[^\]]*\])/,
    `$1\n            res.srcDirs += ${resDirs}`
  );
}

function formatResDirsArray(
  resPath: string,
  layoutsPath: string,
  hasUserLayouts: boolean
): string {
  return hasUserLayouts ? `['${resPath}', '${layoutsPath}']` : `['${resPath}']`;
}

function updateExistingSourceSets(
  contents: string,
  context: WidgetSourceSetContext
): string {
  const { relativePath, resPath, layoutsPath, hasUserLayouts } = context;
  const mainBlockMatch = contents.match(
    /sourceSets\s*\{[^}]*main\s*\{([^}]*)\}/s
  );
  if (!mainBlockMatch) {
    return contents;
  }

  const mainBlockContent = mainBlockMatch[1];
  let updated = contents;

  if (mainBlockContent.includes('java.srcDirs')) {
    updated = appendJavaSrcDir(updated, relativePath);
  } else {
    const resDirs = formatResDirsArray(resPath, layoutsPath, hasUserLayouts);
    updated = addJavaAndResSrcDirs(updated, relativePath, resDirs);
  }

  if (mainBlockContent.includes('res.srcDirs')) {
    updated = appendResSrcDirs(updated, context);
  } else if (!mainBlockContent.includes('res.srcDirs')) {
    const resDirs = formatResDirsArray(resPath, layoutsPath, hasUserLayouts);
    updated = addResSrcDirsAfterJava(updated, resDirs);
  }

  return updated;
}

function createNewSourceSetsBlock(
  contents: string,
  relativePath: string,
  resDirs: string
): string {
  return contents.replace(
    /(android\s*\{)/,
    `$1\n    sourceSets {\n        main {\n            java.srcDirs += ['${relativePath}']\n            res.srcDirs += ${resDirs}\n        }\n    }`
  );
}

function addSourceSetsToContents(
  contents: string,
  context: WidgetSourceSetContext
): string {
  const { relativePath, resPath, layoutsPath, hasUserLayouts } = context;
  const sourceSetsRegex = /android\s*\{[^}]*sourceSets\s*\{/s;
  const hasSourceSets = sourceSetsRegex.test(contents);

  if (hasSourceSets) {
    const sourceSetsMatch = contents.match(
      /sourceSets\s*\{[^}]*main\s*\{[^}]*\}/s
    );
    if (!sourceSetsMatch) {
      return contents;
    }
    return updateExistingSourceSets(contents, context);
  }

  const androidBlockMatch = contents.match(/(android\s*\{)/);
  if (!androidBlockMatch) {
    return contents;
  }

  const resDirs = formatResDirsArray(resPath, layoutsPath, hasUserLayouts);
  return createNewSourceSetsBlock(contents, relativePath, resDirs);
}

export function addWidgetSourceSets(
  buildGradleConfig: { modResults: { contents: string } },
  config: any,
  props: WidgetSourceSetProps
): void {
  const context = getWidgetSourceSetContext(config, props);
  if (!context) {
    return;
  }

  const { modResults } = buildGradleConfig;
  let contents = modResults.contents;

  if (isWidgetSourceSetAlreadyAdded(contents, context.relativePath)) {
    return;
  }

  contents = addSourceSetsToContents(contents, context);
  modResults.contents = contents;
}
