import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { getConfig } from '@expo/config';
import { compileModsAsync } from '@expo/config-plugins';
import type { ExpoConfig } from '@expo/config-types';
import withExpoTargets from '../../plugin/build/index';

import { cleanOrphans, findOrphans } from './orphans';
import { loadProject } from './project';

export interface SyncOptions {
  clean?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  targetsRoot?: string;
}

function validateIosDirectory(projectRoot: string): void {
  const iosPath = path.join(projectRoot, 'ios');
  if (!fs.existsSync(iosPath)) {
    throw new Error(
      'No ios/ directory found. This command is for bare React Native projects.\n' +
        'For Expo managed projects, use: npx expo prebuild'
    );
  }
}

function logVerbose(verbose: boolean | undefined, message: string): void {
  if (verbose) {
    console.log(message);
  }
}

function printOrphans(
  report: ReturnType<typeof findOrphans>,
  { clean, dryRun }: SyncOptions
): void {
  const hasOrphans =
    report.sealedProducts.length > 0 ||
    report.xcodeTargets.length > 0 ||
    report.podfileTargets.length > 0;

  if (!hasOrphans) {
    return;
  }

  console.log(
    '\nOrphaned expo-targets artifacts (no matching targets/*/config):'
  );
  for (const product of report.sealedProducts) {
    console.log(`  • sealed: ExpoTargetsGenerated/${product}/`);
  }
  for (const target of report.xcodeTargets) {
    console.log(`  • xcode target: ${target}`);
  }
  for (const target of report.podfileTargets) {
    console.log(`  • podfile target: ${target}`);
  }

  if (dryRun) {
    console.log('\nDry run — no orphans removed.');
    return;
  }

  if (!clean) {
    console.log('\nPass --clean to remove sealed dirs and Podfile targets.');
    if (report.xcodeTargets.length > 0) {
      console.log(
        'Xcode native targets are report-only; remove them manually or re-sync after deleting configs.'
      );
    }
    return;
  }

  console.log('');
}

function printCleanResult(result: ReturnType<typeof cleanOrphans>): void {
  if (result.removedSealed.length > 0) {
    console.log(
      `Removed sealed dirs: ${result.removedSealed.map((name) => `ExpoTargetsGenerated/${name}/`).join(', ')}`
    );
  }
  if (result.removedPodfileTargets.length > 0) {
    console.log(
      `Removed Podfile targets: ${result.removedPodfileTargets.join(', ')}`
    );
  }
  if (result.skippedXcodeTargets.length > 0) {
    console.log(
      `Xcode targets not removed automatically: ${result.skippedXcodeTargets.join(', ')}`
    );
  }
}

function printDryRunTargets(projectRoot: string, targetsRoot: string): void {
  const ctx = loadProject(projectRoot);
  const iosTargets = ctx.targets.filter((target) =>
    target.config.platforms?.includes('ios')
  );

  if (iosTargets.length === 0) {
    console.log('No iOS targets found to sync.');
    return;
  }

  console.log('Would sync iOS targets:');
  for (const target of iosTargets) {
    const name =
      target.config.displayName || target.config.name || target.dirName;
    console.log(
      `  • ${name} (${path.relative(projectRoot, target.configPath)})`
    );
  }
  console.log(
    `\nTargets root: ${targetsRoot}\n` +
      'Dry run lists targets and orphans only — no ios/ writes.'
  );
}

async function buildPluginConfig(
  projectRoot: string,
  options: SyncOptions
): Promise<ExpoConfig> {
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    skipPlugins: true,
  });

  return withExpoTargets(exp, {
    targetsRoot: options.targetsRoot,
    debug: options.verbose,
  });
}

export async function runSync(
  options: SyncOptions = {},
  projectRoot = process.cwd()
): Promise<number> {
  validateIosDirectory(projectRoot);

  const targetsRoot = options.targetsRoot ?? './targets';
  const ctx = loadProject(projectRoot);
  const iosTargets = ctx.targets.filter((target) =>
    target.config.platforms?.includes('ios')
  );

  if (iosTargets.length === 0) {
    console.log(`No iOS targets found under ${targetsRoot}/`);
    const orphans = findOrphans(projectRoot, ctx);
    printOrphans(orphans, options);
    if (options.clean && !options.dryRun) {
      printCleanResult(cleanOrphans(projectRoot, orphans));
    }
    return 0;
  }

  logVerbose(options.verbose, `Project root: ${projectRoot}`);
  logVerbose(options.verbose, `iOS targets: ${iosTargets.length}`);

  if (options.dryRun) {
    printDryRunTargets(projectRoot, targetsRoot);
    const orphans = findOrphans(projectRoot, ctx);
    printOrphans(orphans, options);
    console.log('\nDry run complete — no files written.');
    return 0;
  }

  const config = await buildPluginConfig(projectRoot, options);

  logVerbose(options.verbose, 'Applying iOS config plugin mods…');
  await compileModsAsync(config, {
    projectRoot,
    platforms: ['ios'],
  });

  const orphans = findOrphans(projectRoot, loadProject(projectRoot));
  printOrphans(orphans, options);
  if (options.clean) {
    printCleanResult(cleanOrphans(projectRoot, orphans));
  }

  console.log('\nSync complete. Run `pod install` in ios/ if Podfile changed.');
  return 0;
}
