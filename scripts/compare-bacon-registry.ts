#!/usr/bin/env bun
/**
 * Compare expo-targets ExtensionType set to the pinned Bacon TARGET_REGISTRY snapshot.
 *
 * M0–M3: report mode (exit 0) — missing types expected until coverage catches up.
 * M4 harden: set COMPARE_BACON_HARDEN=1 (or --harden) to exit 1 on unexpected missing
 * (aliases like imessage are documented, not required as ExtensionType keys).
 */

import path from "node:path";
import { EXTENSION_TYPES } from "../packages/expo-targets/plugin/src/domain/characteristics";

const ROOT = path.resolve(import.meta.dir, "..");
const SNAPSHOT = path.join(ROOT, "scripts/fixtures/bacon-target.snapshot.ts");

/** Bacon keys that are aliases / exclusives — not required 1:1 on ExtensionType. */
const DOCUMENTED_ALIASES = new Set(["imessage"]);

/** expo-targets exclusives not in Bacon. */
const EXPO_EXCLUSIVES = new Set(["stickers", "messages"]);

async function baconKeys(): Promise<string[]> {
  const text = await Bun.file(SNAPSHOT).text();
  const start = text.indexOf("export const TARGET_REGISTRY");
  const end = text.indexOf("} as const satisfies");
  if (start < 0 || end < 0) {
    throw new Error("Could not locate TARGET_REGISTRY in Bacon snapshot");
  }
  const body = text.slice(start, end);
  // Match top-level registry keys only (2-space indent under TARGET_REGISTRY).
  const keys = [
    ...body.matchAll(
      /^\s{2}(?:['"]([a-z0-9-]+)['"]|([a-z][a-z0-9-]*))\s*:\s*\{/gm,
    ),
  ].map((m) => m[1] || m[2]);
  return [...new Set(keys)];
}

const harden =
  process.argv.includes("--harden") || process.env.COMPARE_BACON_HARDEN === "1";

const bacon = await baconKeys();
const ours = new Set(EXTENSION_TYPES as string[]);

const missingFromUs = bacon.filter(
  (k) => !ours.has(k) && !DOCUMENTED_ALIASES.has(k),
);
const extraOurs = [...ours].filter(
  (k) => !bacon.includes(k) && !EXPO_EXCLUSIVES.has(k),
);

const report = {
  mode: harden ? "harden" : "report",
  baconCount: bacon.length,
  expoCount: ours.size,
  missingFromExpoTargets: missingFromUs,
  expoExclusives: [...EXPO_EXCLUSIVES],
  documentedAliases: [...DOCUMENTED_ALIASES],
  unexpectedExtraInExpo: extraOurs,
};

console.log(JSON.stringify(report, null, 2));

if (harden && missingFromUs.length > 0) {
  console.error(
    `compare-bacon-registry: ${missingFromUs.length} Bacon type(s) still missing`,
  );
  process.exit(1);
}

process.exit(0);
