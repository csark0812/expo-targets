#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { Command } from 'commander';

import { printDoctorReport, runDoctor } from './doctor';
import { runExportExtensionBundles } from './exportExtensionBundles';
import { runExportSafari } from './exportSafari';
import { runGenerate } from './generate';
import { scaffoldTarget } from './scaffold';
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
  .command('add')
  .description(
    'Scaffold a target (omit args for interactive; or: add <type> <name>)'
  )
  .argument('[type]', 'Extension type (e.g. share, widget, safari)')
  .argument('[name]', 'Target folder name (kebab-case, e.g. my-share)')
  .option('--no-wire', 'Scaffold only; skip host wiring')
  .option('--no-rn', 'Do not use React Native UI (when type supports it)')
  .option(
    '--ui <mode>',
    'Widget UI mode: native (default) or expo-ui',
    'native'
  )
  .option('--configurable', 'Widget: AppIntentConfiguration (Edit Widget)')
  .option('--live-activity', 'Widget: include Live Activity bootstrap')
  .action(
    async (
      type: string | undefined,
      name: string | undefined,
      options: {
        wire?: boolean;
        rn?: boolean;
        ui?: string;
        configurable?: boolean;
        liveActivity?: boolean;
      }
    ) => {
      const widgetUi =
        options.ui === 'expo-ui' || options.ui === 'native'
          ? options.ui
          : undefined;
      const code = await scaffoldTarget({
        type,
        name,
        nonInteractive: Boolean(type && name),
        noWire: options.wire === false,
        useReactNative: options.rn === false ? false : undefined,
        widgetUi,
        configurableWidget: options.configurable,
        includeLiveActivity: options.liveActivity,
      });
      if (code === 0 && !(options.wire === false)) {
        try {
          runGenerate();
        } catch {
          // generate is best-effort after scaffold
        }
      }
      process.exit(code);
    }
  );

program
  .command('doctor')
  .description(
    'Validate plugin, Metro, App Groups, entries, name sync, and EAS signing hints'
  )
  .option('--fix', 'Regenerate .expo/types/expo-targets.d.ts')
  .action((options: { fix?: boolean }) => {
    if (options.fix) {
      runGenerate();
    }
    const code = printDoctorReport(runDoctor());
    process.exit(code);
  });

program
  .command('generate')
  .description('Regenerate .expo/types/expo-targets.d.ts without full prebuild')
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
  .command('export-extension-bundles')
  .description(
    'Hermes-export RN extension entries into dist/ + assets/expo-targets for eas update'
  )
  .option('--dist <path>', 'Output directory', './dist')
  .option(
    '--assets <path>',
    'Metro-requireable assets root (extensionBundleModules.js)',
    './assets/expo-targets'
  )
  .option('--no-assets', 'Skip writing assets/expo-targets')
  .option(
    '--no-hermes',
    'Do not run expo export:embed (requires --bundle or --placeholder)'
  )
  .option(
    '--placeholder',
    'Write placeholder bundles (tests / dry-run only)',
    false
  )
  .action(
    (options: {
      dist?: string;
      assets?: string;
      hermes?: boolean;
      placeholder?: boolean;
    }) => {
      const cwd = process.cwd();
      const assetsOpt = (options as { assets?: string | false }).assets;
      const { code } = runExportExtensionBundles({
        distRoot: resolve(cwd, options.dist ?? './dist'),
        assetsRoot:
          assetsOpt === false
            ? false
            : resolve(
                cwd,
                typeof assetsOpt === 'string'
                  ? assetsOpt
                  : './assets/expo-targets'
              ),
        allowPlaceholder: Boolean(options.placeholder),
        hermes: options.hermes !== false,
      });
      process.exit(code);
    }
  );

program
  .command('export-safari')
  .description('Export Safari extension RN Web bundles to sealed Resources')
  .action(() => {
    process.exit(runExportSafari());
  });

program.parse();
