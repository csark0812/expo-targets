import process from 'node:process';

import { checkAppGroups } from './checks/appGroups';
import { warnDualWidgets } from './checks/dualWidgets';
import {
  checkEasCredentialErrors,
  checkEasCredentialWarnings,
} from './checks/easCredentials';
import { checkEntries } from './checks/entries';
import { warnHeavyExclusions } from './checks/heavyExclusions';
import { checkMetro } from './checks/metro';
import { checkNameSync } from './checks/nameSync';
import { checkPlugin } from './checks/plugin';
import { warnSealedZone } from './checks/sealedZone';
import { checkUiMode } from './checks/uiMode';
import { warnUnusedWidgetBundle } from './checks/unusedWidgetBundle';
import { warnExtensionBundleExport } from './checks/updateScript';
import { loadProject } from './project';
import type { CheckResult } from './types';

export interface DoctorReport {
  errors: CheckResult[];
  warnings: CheckResult[];
  passed: string[];
}

function collectFailures(ctx: ReturnType<typeof loadProject>): CheckResult[] {
  const results: CheckResult[] = [];
  const plugin = checkPlugin(ctx);
  if (plugin) {
    results.push(plugin);
  }
  const metro = checkMetro(ctx);
  if (metro) {
    results.push(metro);
  }
  results.push(...checkAppGroups(ctx));
  results.push(...checkEntries(ctx));
  results.push(...checkNameSync(ctx));
  results.push(...checkEasCredentialErrors(ctx));
  return results;
}

function collectWarnings(ctx: ReturnType<typeof loadProject>): CheckResult[] {
  return [
    ...warnUnusedWidgetBundle(ctx),
    ...warnSealedZone(ctx),
    ...warnDualWidgets(ctx),
    ...checkUiMode(ctx),
    ...warnHeavyExclusions(ctx),
    ...warnExtensionBundleExport(ctx),
    ...checkEasCredentialWarnings(ctx),
  ];
}

function passedChecks(ctx: ReturnType<typeof loadProject>): string[] {
  const passed: string[] = [];
  if (!checkPlugin(ctx)) {
    passed.push('Expo plugin registered');
  }
  if (!checkMetro(ctx)) {
    passed.push('Metro config');
  }
  if (checkAppGroups(ctx).length === 0 && ctx.targets.length > 0) {
    passed.push('App Groups');
  }
  if (checkEntries(ctx).length === 0) {
    passed.push('Entry files');
  }
  if (checkNameSync(ctx).length === 0) {
    passed.push('Name sync');
  }
  return passed;
}

export function runDoctor(projectRoot = process.cwd()): DoctorReport {
  const ctx = loadProject(projectRoot);
  return {
    errors: collectFailures(ctx),
    warnings: collectWarnings(ctx),
    passed: passedChecks(ctx),
  };
}

function printSection(
  label: string,
  items: CheckResult[],
  prefix: string
): void {
  if (items.length === 0) {
    return;
  }
  console.log(`\n${label}:`);
  for (const item of items) {
    console.log(`  ${prefix} [${item.title}] ${item.message}`);
    if (item.fix) {
      console.log(`    → ${item.fix.split('\n').join('\n      ')}`);
    }
  }
}

function printPassed(passed: string[]): void {
  if (passed.length === 0) {
    return;
  }
  console.log('\n✓ Passed:');
  for (const item of passed) {
    console.log(`  • ${item}`);
  }
}

function printSummary(report: DoctorReport): void {
  if (report.errors.length > 0) {
    return;
  }
  if (report.passed.length === 0 && report.warnings.length === 0) {
    console.log('No targets found under targets/.');
    return;
  }
  console.log('\nAll checks passed.');
}

export function printDoctorReport(report: DoctorReport): number {
  printPassed(report.passed);
  printSection('⚠ Warnings', report.warnings, '•');
  printSection('✗ Failed', report.errors, '•');
  printSummary(report);
  return report.errors.length > 0 ? 1 : 0;
}
