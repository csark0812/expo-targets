import fs from 'node:fs';
import path from 'node:path';

/** expo-targets monorepo root (examples/.devicewright → ../..) */
export function repoRoot(): string {
  return path.resolve(__dirname, '../..');
}

export function exampleAbsPath(exampleRel: string): string {
  return path.join(repoRoot(), exampleRel);
}

export function exampleExists(exampleRel: string): boolean {
  try {
    return fs.statSync(exampleAbsPath(exampleRel)).isDirectory();
  } catch {
    return false;
  }
}
