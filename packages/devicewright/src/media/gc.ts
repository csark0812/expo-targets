/**
 * Best-effort cleanup of devicewright-* artifacts under os.tmpdir().
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_OLDER_THAN_MS = 24 * 60 * 60 * 1000;

export type GcOptions = {
  olderThanMs?: number;
  tmpDir?: string;
};

export type GcResult = {
  removed: string[];
  errors: string[];
};

export function gcDevicewrightTemp(options: GcOptions = {}): GcResult {
  const olderThanMs = options.olderThanMs ?? DEFAULT_OLDER_THAN_MS;
  const tmpDir = options.tmpDir ?? os.tmpdir();
  const cutoff = Date.now() - olderThanMs;
  const removed: string[] = [];
  const errors: string[] = [];

  let entries: string[];
  try {
    entries = fs.readdirSync(tmpDir);
  } catch (e) {
    return { removed, errors: [String(e)] };
  }

  for (const name of entries) {
    if (!name.startsWith("devicewright-")) continue;
    const full = path.join(tmpDir, name);
    try {
      const st = fs.statSync(full);
      if (st.mtimeMs >= cutoff) continue;
      fs.rmSync(full, { recursive: true, force: true });
      removed.push(full);
    } catch (e) {
      errors.push(`${full}: ${String(e)}`);
    }
  }

  return { removed, errors };
}
