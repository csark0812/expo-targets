import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { assertSafeDeviceId } from './allowlist';

export type LockHandle = {
  deviceId: string;
  path: string;
  release: () => void;
};

/** In-process hold set so the same PID cannot double-lock. */
const heldInProcess = new Set<string>();

function lockPathFor(deviceId: string): string {
  const safe = deviceId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(os.tmpdir(), `devicewright-${safe}.lock`);
}

function pidAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockPid(lockFile: string): number | null {
  try {
    const raw = fs.readFileSync(lockFile, 'utf8').trim();
    const pid = Number(raw);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

/**
 * Hard PID/file lock keyed by device id (simulator UDID, emulator serial, or physical UDID).
 * Second holder fails immediately (including same process).
 */
export function acquireDeviceLock(deviceId: string): LockHandle {
  const id = assertSafeDeviceId(deviceId);
  if (heldInProcess.has(id)) {
    throw new Error(`device ${id} already locked by this process`);
  }

  const lockFile = lockPathFor(id);
  const existing = readLockPid(lockFile);
  if (existing !== null) {
    if (pidAlive(existing) && existing !== process.pid) {
      throw new Error(
        `device ${id} already locked by pid ${existing} (${lockFile})`
      );
    }
    try {
      fs.unlinkSync(lockFile);
    } catch {
      // race
    }
  }

  const fd = fs.openSync(lockFile, 'wx');
  try {
    fs.writeFileSync(fd, `${process.pid}\n`);
  } finally {
    fs.closeSync(fd);
  }

  heldInProcess.add(id);

  let released = false;
  const release = () => {
    if (released) {
      return;
    }
    released = true;
    heldInProcess.delete(id);
    try {
      const current = readLockPid(lockFile);
      if (current === process.pid) {
        fs.unlinkSync(lockFile);
      }
    } catch {
      // ignore
    }
  };

  return { deviceId: id, path: lockFile, release };
}

/** @deprecated alias for harness migration */
export const acquireSimLock = acquireDeviceLock;
