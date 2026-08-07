#!/usr/bin/env bun
/**
 * Prebuild + assembleRelease + adb install for REQUIRED_ANDROID example hosts.
 * Usage: bun scripts/android-install-required.ts [--device=emulator-5554] [--ids=a,b]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  REQUIRED_ANDROID,
  REQUIRED_ANDROID_IDS,
} from "../examples/.devicewright/required";
import { TARGET_CATALOG, hostLaunchId } from "../examples/.devicewright/catalog";

const root = path.resolve(import.meta.dir, "..");
const device =
  process.argv.find((a) => a.startsWith("--device="))?.slice("--device=".length) ||
  "emulator-5554";
const idsArg = process.argv.find((a) => a.startsWith("--ids="));
const ids = idsArg
  ? idsArg.slice("--ids=".length).split(",").filter(Boolean)
  : [...REQUIRED_ANDROID_IDS];

function run(cmd: string, cwd: string, env?: NodeJS.ProcessEnv): void {
  console.log(`\n$ (${cwd}) ${cmd}`);
  const r = spawnSync(cmd, {
    cwd,
    shell: true,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) {
    throw new Error(`command failed (${r.status}): ${cmd}`);
  }
}

function findApk(androidDir: string): string {
  const candidates = [
    path.join(androidDir, "app/build/outputs/apk/release/app-release.apk"),
    path.join(androidDir, "app/build/outputs/apk/debug/app-debug.apk"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(`no apk under ${androidDir}`);
}

const failed: string[] = [];
for (const id of ids) {
  const row = REQUIRED_ANDROID.find((r) => r.id === id);
  if (!row) {
    failed.push(`${id}: not in REQUIRED_ANDROID`);
    continue;
  }
  const entry = TARGET_CATALOG[id];
  const pkg = entry ? hostLaunchId(entry, "android") : "?";
  const exampleDir = path.join(root, row.path);
  try {
    console.log(`\n=== ${id} → ${pkg} ===`);
    run("npx expo prebuild --platform android --no-install", exampleDir);
    const androidDir = path.join(exampleDir, "android");
    run(
      "./gradlew assembleRelease -x lintVitalAnalyzeRelease -x lintVitalReportRelease -x lintVitalRelease",
      androidDir,
    );
    const apk = findApk(androidDir);
    run(`adb -s ${device} install -r "${apk}"`, root);
    console.log(`installed ${id} (${pkg})`);
  } catch (e) {
    console.error(e);
    failed.push(`${id}: ${e}`);
  }
}

if (failed.length) {
  console.error("\nFailed:\n", failed.join("\n"));
  process.exit(1);
}
console.log("\nAll requested hosts installed.");
