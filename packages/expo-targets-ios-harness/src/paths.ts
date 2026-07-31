import fs from 'node:fs';
import path from 'node:path';

/** packages/expo-targets-ios-harness (works from src/ or build/). */
export function packageRoot(): string {
  return path.resolve(__dirname, '..');
}

/** Monorepo root (packages/../). */
export function repoRoot(): string {
  return path.resolve(packageRoot(), '..', '..');
}

export function fixtureSmokePath(): string {
  return path.join(packageRoot(), 'fixtures', 'ShareSheetSmoke.swift');
}

export function exampleIosDir(exampleRel: string): string {
  return path.join(repoRoot(), exampleRel, 'ios');
}

export function findXcodeproj(iosDir: string): string {
  const names = fs
    .readdirSync(iosDir)
    .filter((name) => name.endsWith('.xcodeproj'));
  if (names.length === 0) {
    throw new Error(`no xcodeproj under ${iosDir}`);
  }
  return path.join(iosDir, names[0]);
}

export function findXcworkspace(iosDir: string): string {
  const names = fs
    .readdirSync(iosDir)
    .filter((name) => name.endsWith('.xcworkspace') && !name.startsWith('.'));
  if (names.length === 0) {
    throw new Error(`no xcworkspace under ${iosDir}`);
  }
  return path.join(iosDir, names[0]);
}
