import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { getProjectName } from '../apply/pbx/targetLifecycle';
import { exportSafariWebBundle } from './exportSafariWebBundle';

interface CliArgs {
  projectRoot: string;
  entryPath: string;
  popupPath: string;
}

function applyCliFlag({
  arg,
  argv,
  index,
  state,
}: {
  arg: string;
  argv: string[];
  index: number;
  state: CliArgs;
}): number {
  if (arg === '--project-root') {
    state.projectRoot = argv[index + 1] ?? state.projectRoot;
    return 1;
  }
  if (arg === '--entry') {
    state.entryPath = argv[index + 1] ?? state.entryPath;
    return 1;
  }
  if (arg === '--popup') {
    state.popupPath = argv[index + 1] ?? state.popupPath;
    return 1;
  }
  return 0;
}

function parseArgs(argv: string[]): CliArgs {
  const state: CliArgs = {
    projectRoot: process.cwd(),
    entryPath: '',
    popupPath: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    index += applyCliFlag({ arg: argv[index], argv, index, state });
  }

  if (!(state.entryPath && state.popupPath)) {
    throw new Error(
      'Usage: export-safari-bundle --project-root <dir> --entry <file> --popup <file>'
    );
  }

  return state;
}

function productNameFromPopup(popupPath: string): string {
  const parts = popupPath.split(path.sep);
  const generatedIndex = parts.lastIndexOf('ExpoTargetsGenerated');
  if (generatedIndex >= 0 && parts[generatedIndex + 1]) {
    return parts[generatedIndex + 1];
  }
  return path.basename(path.dirname(path.dirname(popupPath)));
}

function runCli(argv: string[]): number {
  const args = parseArgs(argv);
  const platformProjectRoot = path.join(args.projectRoot, 'ios');
  const projectName = getProjectName(platformProjectRoot);
  const entryFile = path.relative(args.projectRoot, args.entryPath);
  const productName = productNameFromPopup(args.popupPath);

  const result = exportSafariWebBundle({
    projectRoot: args.projectRoot,
    platformProjectRoot,
    projectName,
    target: { entryFile, productName },
  });

  if (!(result.skipped || fs.existsSync(args.popupPath))) {
    throw new Error(`Safari web export did not write ${args.popupPath}`);
  }

  return 0;
}

if (require.main === module) {
  try {
    process.exit(runCli(process.argv.slice(2)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`expo-targets: ${message}`);
    process.exit(1);
  }
}
