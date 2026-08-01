import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Create a fresh, uniquely named temp directory for a test run.
 * Callers are responsible for cleaning it up with `removeTempDir` (e.g. in `afterEach`).
 */
export function makeTempDir(prefix = 'expo-targets-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Recursively remove a temp directory created by `makeTempDir`.
 * Safe to call even if the directory was already removed.
 */
export function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}
