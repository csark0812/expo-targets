#!/usr/bin/env node
import process from 'node:process';
import { Command } from 'commander';
import { runSync } from './sync';

const program = new Command();

program
  .name('expo-targets')
  .description('Manage native targets for Expo and React Native apps')
  .version('0.1.0');

program
  .command('sync')
  .description('Sync targets to Xcode project (for bare React Native)')
  .option('--clean', 'Remove orphaned sealed dirs and Podfile targets')
  .option('--dry-run', 'Show what would change without writing files')
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

program.parse();
