/**
 * System-wide singleton for mcp-dev: Cursor + agent workers often spawn many
 * copies of the same mcp.json entry. Without a lock, watchers accumulate
 * (80+ mcp-dev / 160+ mcp.js) and tear down idb companions under contention.
 *
 * On start we steal any prior live holder for the same key (cwd + child argv),
 * SIGTERM its process tree, then write our pid.
 */

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { log } from "./log";

export type SingletonHandle = {
  key: string;
  path: string;
  release: () => void;
};

export function singletonKey(cwd: string, childArgv: string[]): string {
  const raw = `${path.resolve(cwd)}\0${childArgv.join("\0")}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export function singletonPath(key: string): string {
  return path.join(os.tmpdir(), `mcp-dev-${key}.pid`);
}

function pidAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid(file: string): number | null {
  try {
    const n = Number(fs.readFileSync(file, "utf8").trim().split(/\s/)[0]);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function killTree(pid: number): void {
  // Children first (mcp.js), then parent.
  try {
    const out = spawnSync("pgrep", ["-P", String(pid)], { encoding: "utf8" });
    if (out.status === 0 && out.stdout.trim()) {
      for (const line of out.stdout.trim().split("\n")) {
        const child = Number(line.trim());
        if (Number.isFinite(child) && child > 0) {
          try {
            process.kill(child, "SIGTERM");
          } catch {
            /* ignore */
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    /* ignore */
  }
}

function sleepSync(ms: number): void {
  const sab = new SharedArrayBuffer(4);
  const view = new Int32Array(sab);
  Atomics.wait(view, 0, 0, ms);
}

/**
 * Acquire exclusive ownership for this mcp-dev identity. Steals from a live
 * prior holder (Cursor respawn / orphan) so only one watcher survives.
 */
export function acquireMcpDevSingleton(
  cwd: string,
  childArgv: string[],
): SingletonHandle {
  const key = singletonKey(cwd, childArgv);
  const file = singletonPath(key);

  const existing = readPid(file);
  if (existing !== null && existing !== process.pid && pidAlive(existing)) {
    log(
      `singleton: stealing from live pid ${existing} (${file}) — killing prior mcp-dev tree`,
    );
    killTree(existing);
    const deadline = Date.now() + 3_000;
    while (Date.now() < deadline && pidAlive(existing)) {
      sleepSync(100);
    }
    if (pidAlive(existing)) {
      try {
        process.kill(existing, "SIGKILL");
      } catch {
        /* ignore */
      }
      sleepSync(100);
    }
  }

  try {
    fs.unlinkSync(file);
  } catch {
    /* ignore */
  }

  const fd = fs.openSync(file, "wx");
  try {
    fs.writeFileSync(fd, `${process.pid}\n`);
  } finally {
    fs.closeSync(fd);
  }

  log(`singleton: acquired ${file} (key=${key})`);

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try {
      if (readPid(file) === process.pid) {
        fs.unlinkSync(file);
      }
    } catch {
      /* ignore */
    }
  };

  return { key, path: file, release };
}
