#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { Command } from 'commander';

import { printDoctorReport, runDoctor } from './doctor';
import { runExportSafari } from './exportSafari';
import { runGenerate } from './generate';
import { runSync } from './sync';

function readVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '../../package.json'), 'utf8')
    ) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const program = new Command();

program
  .name('expo-targets')
  .description('Validate and manage expo-targets host wiring')
  .version(readVersion());

program
  .command('doctor')
  .description('Validate plugin, Metro, App Groups, entries, and name sync')
  .option('--fix', 'Regenerate .expo/expo-targets.generated.ts')
  .action((options: { fix?: boolean }) => {
    if (options.fix) {
      runGenerate();
    }
    const code = printDoctorReport(runDoctor());
    process.exit(code);
  });

program
  .command('generate')
  .description(
    'Regenerate .expo/expo-targets.generated.ts without full prebuild'
  )
  .action(() => {
    process.exit(runGenerate());
  });

program
  .command('sync')
  .description('Sync targets to an existing ios/ tree (bare React Native)')
  .option('--clean', 'Remove orphaned sealed dirs and Podfile targets')
  .option('--dry-run', 'Preview changes without writing files')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--targets-root <path>', 'Custom targets directory', './targets')
  .action(
    async (options: {
      clean?: boolean;
      dryRun?: boolean;
      verbose?: boolean;
      targetsRoot?: string;
    }) => {
      try {
        const code = await runSync({
          clean: options.clean,
          dryRun: options.dryRun,
          verbose: options.verbose,
          targetsRoot: options.targetsRoot,
        });
        process.exit(code);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'expo-targets sync failed';
        console.error(message);
        if (options.verbose && error instanceof Error && error.stack) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    }
  );

program
  .command('export-safari')
  .description('Export Safari extension RN Web bundles to sealed Resources')
  .action(() => {
    process.exit(runExportSafari());
  });

program.parse();
