import { afterEach, describe, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { acquireSimLock } from './lock';

const TEST_UDID = 'lock-test-udid-ios-harness';

function lockFile(): string {
  return path.join(
    os.tmpdir(),
    `expo-targets-ios-harness-${TEST_UDID.replace(/[^a-zA-Z0-9_-]/g, '_')}.lock`
  );
}

afterEach(() => {
  try {
    fs.unlinkSync(lockFile());
  } catch {
    // ignore
  }
});

describe('acquireSimLock', () => {
  test('acquires and releases', () => {
    const handle = acquireSimLock(TEST_UDID);
    expect(fs.existsSync(handle.path)).toBe(true);
    expect(fs.readFileSync(handle.path, 'utf8').trim()).toBe(
      String(process.pid)
    );
    handle.release();
    expect(fs.existsSync(handle.path)).toBe(false);
  });

  test('fails when another live pid holds the lock', async () => {
    const child = spawn('sleep', ['30'], { stdio: 'ignore' });
    try {
      fs.writeFileSync(lockFile(), `${child.pid}\n`);
      expect(() => acquireSimLock(TEST_UDID)).toThrow(/already locked/);
    } finally {
      child.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        child.on('exit', () => resolve());
      });
    }
  });

  test('reaps stale pid and acquires', () => {
    fs.writeFileSync(lockFile(), '999999999\n');
    const handle = acquireSimLock(TEST_UDID);
    expect(fs.readFileSync(handle.path, 'utf8').trim()).toBe(
      String(process.pid)
    );
    handle.release();
  });
});
