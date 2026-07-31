import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { attachExample } from './attach';
import { acquireSimLock } from './lock';
import {
  type ExampleRel,
  type MatrixEntry,
  resolveMatrixEntries,
} from './matrix';
import { exampleIosDir, findXcworkspace, repoRoot } from './paths';
import { assertSimulatorExists, bootSimulator, resolveSimUdid } from './sim';

export type RunOptions = {
  exampleRels?: ExampleRel[];
  udid?: string;
  skipAttach?: boolean;
  logDir?: string;
};

export type RunResult = {
  ok: boolean;
  udid: string;
  completed: ExampleRel[];
  failed?: { exampleRel: ExampleRel; logPath: string; exitCode: number };
};

function resolveUdid(explicit?: string): string {
  const udid = explicit || resolveSimUdid();
  assertSimulatorExists(udid);
  return udid;
}

function runXcodebuildTest(opts: {
  entry: MatrixEntry;
  udid: string;
  logPath: string;
}): number {
  const iosDir = exampleIosDir(opts.entry.exampleRel);
  const workspace = findXcworkspace(iosDir);
  const args = [
    'test',
    '-workspace',
    workspace,
    '-scheme',
    opts.entry.scheme,
    '-configuration',
    'Release',
    '-destination',
    `platform=iOS Simulator,id=${opts.udid}`,
    `-only-testing:${opts.entry.uiTestTargetName}`,
  ];
  fs.mkdirSync(path.dirname(opts.logPath), { recursive: true });
  const out = fs.openSync(opts.logPath, 'w');
  try {
    const result = spawnSync('xcodebuild', args, {
      cwd: path.join(repoRoot(), opts.entry.exampleRel),
      stdio: ['ignore', out, out],
      env: {
        ...process.env,
        ...opts.entry.env,
      },
    });
    return result.status ?? 1;
  } finally {
    fs.closeSync(out);
  }
}

function attachIfNeeded(entry: MatrixEntry, skipAttach?: boolean): void {
  if (skipAttach) {
    return;
  }
  const attached = attachExample(entry);
  const created = attached.uiTestCreated ? ' (created UITest target)' : '';
  const testable = attached.testableAdded ? ' (added scheme testable)' : '';
  console.error(
    `[ios-harness] attached ${attached.exampleRel}${created}${testable}`
  );
}

function testOne(opts: {
  entry: MatrixEntry;
  udid: string;
  logDir: string;
}): { ok: true } | { ok: false; logPath: string; exitCode: number } {
  const slug = opts.entry.exampleRel.replace(/\//g, '-');
  const logPath = path.join(opts.logDir, `${slug}.xcodebuild.log`);
  console.error(
    `[ios-harness] testing ${opts.entry.exampleRel} on ${opts.udid} (log: ${logPath})`
  );
  const exitCode = runXcodebuildTest({
    entry: opts.entry,
    udid: opts.udid,
    logPath,
  });
  if (exitCode !== 0) {
    console.error(
      `[ios-harness] FAIL ${opts.entry.exampleRel} udid=${opts.udid} exit=${exitCode} log=${logPath}`
    );
    return { ok: false, logPath, exitCode };
  }
  console.error(`[ios-harness] PASS ${opts.entry.exampleRel}`);
  return { ok: true };
}

/** Serial fail-fast matrix run under a UDID lock. */
export function runMatrix(options: RunOptions = {}): RunResult {
  const udid = resolveUdid(options.udid);
  const entries = resolveMatrixEntries(options.exampleRels);
  const logDir =
    options.logDir ??
    path.join(repoRoot(), '.ios-harness', `run-${Date.now()}`);
  fs.mkdirSync(logDir, { recursive: true });

  const lock = acquireSimLock(udid);
  const completed: ExampleRel[] = [];
  try {
    bootSimulator(udid);
    for (const entry of entries) {
      attachIfNeeded(entry, options.skipAttach);
      const result = testOne({ entry, udid, logDir });
      if (!result.ok) {
        return {
          ok: false,
          udid,
          completed,
          failed: {
            exampleRel: entry.exampleRel,
            logPath: result.logPath,
            exitCode: result.exitCode,
          },
        };
      }
      completed.push(entry.exampleRel);
    }
    return { ok: true, udid, completed };
  } finally {
    lock.release();
  }
}

/** @deprecated Prefer runMatrix({ exampleRels: shareSheetMatrix() }). */
export function runShareSheetMatrix(options: RunOptions = {}): RunResult {
  return runMatrix(options);
}
