#!/usr/bin/env node
import { Command } from 'commander';
import { syncTargets } from './sync';

const program = new Command();

program
  .name('expo-targets')
  .description('Manage native targets for Expo and React Native apps')
  .version('0.1.0');

program
  .command('sync')
  .description('Sync targets to Xcode project (for bare React Native)')
  .option('--clean', 'Remove orphaned targets from Xcode project')
  .option('--dry-run', 'Show what would change without writing files')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--targets-root <path>', 'Custom targets directory', './targets')
  .action(async (options) => {
    try {
      await syncTargets(options);
    } catch (error: any) {
      console.error('[expo-targets-sync] Error:', error.message);
      if (options.verbose && error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();
