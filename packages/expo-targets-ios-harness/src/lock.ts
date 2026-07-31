import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export type LockHandle = {
  udid: string;
  path: string;
  release: () => void;
};

function lockPathFor(udid: string): string {
  const safe = udid.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(os.tmpdir(), `expo-targets-ios-harness-${safe}.lock`);
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
    const raw = fs.readFileSync(lockFile, "utf8").trim();
    const pid = Number(raw);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

/**
 * Hard PID/file lock keyed by simulator UDID.
 * Second holder exits immediately (non-zero via thrown error).
 */
export function acquireSimLock(udid: string): LockHandle {
  const lockFile = lockPathFor(udid);
  const existing = readLockPid(lockFile);
  if (existing !== null) {
    if (pidAlive(existing) && existing !== process.pid) {
      throw new Error(
        `simulator ${udid} already locked by pid ${existing} (${lockFile})`,
      );
    }
    try {
      fs.unlinkSync(lockFile);
    } catch {
      // race: another process may have removed it
    }
  }

  const fd = fs.openSync(lockFile, "wx");
  try {
    fs.writeFileSync(fd, `${process.pid}\n`);
  } finally {
    fs.closeSync(fd);
  }

  let released = false;
  const release = () => {
    if (released) {
      return;
    }
    released = true;
    try {
      const current = readLockPid(lockFile);
      if (current === process.pid) {
        fs.unlinkSync(lockFile);
      }
    } catch {
      // ignore
    }
  };

  return { udid, path: lockFile, release };
}
