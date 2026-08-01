/**
 * Opt-in Release ensure-install for REQUIRED_V1 hosts.
 * When a host bundle is missing on the sim, prebuild (if needed) +
 * `expo run:ios --configuration Release`.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { TARGET_CATALOG } from "./catalog";
import { exampleAbsPath, exampleExists } from "./root";

const ensuredThisRun = new Set<string>();

export type EnsureHostReleaseInstallOptions = {
  id: string;
  deviceId: string;
};

function cacheKey(udid: string, bundleId: string): string {
  return `${udid}:${bundleId}`;
}

/** True if bundleId is installed on the given simulator. */
export function isHostInstalledOnSim(udid: string, bundleId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "get_app_container", udid, bundleId],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    },
  );
  return r.status === 0;
}

async function runStreaming(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      env: { ...process.env, CI: "1" },
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(`${cmd} ${args.join(" ")} exited ${code} (cwd=${cwd})`),
        );
      }
    });
  });
}

/**
 * If the catalog host is not on `deviceId`, Release-build + install it.
 * No-op when already installed (or already ensured this process).
 */
export async function ensureHostReleaseInstall(
  options: EnsureHostReleaseInstallOptions,
): Promise<{ skipped: boolean; built: boolean }> {
  const entry = TARGET_CATALOG[options.id];
  if (!entry) {
    throw new Error(`ensure-install: unknown catalog id ${options.id}`);
  }
  if (!exampleExists(entry.path)) {
    throw new Error(`ensure-install: missing example path ${entry.path}`);
  }

  const udid = options.deviceId;
  const key = cacheKey(udid, entry.hostBundleId);
  if (ensuredThisRun.has(key)) {
    return { skipped: true, built: false };
  }

  if (isHostInstalledOnSim(udid, entry.hostBundleId)) {
    ensuredThisRun.add(key);
    console.error(
      `[ensure-install] ${entry.id}: ${entry.hostBundleId} already on ${udid}`,
    );
    return { skipped: true, built: false };
  }

  const cwd = exampleAbsPath(entry.path);
  const iosDir = path.join(cwd, "ios");
  console.error(
    `[ensure-install] ${entry.id}: ${entry.hostBundleId} missing — Release build into ${udid}`,
  );

  if (!fs.existsSync(iosDir)) {
    console.error(`[ensure-install] ${entry.id}: prebuild ios/`);
    await runStreaming(
      "npx",
      ["expo", "prebuild", "--platform", "ios", "--non-interactive"],
      cwd,
    );
  }

  await runStreaming(
    "npx",
    [
      "expo",
      "run:ios",
      "--configuration",
      "Release",
      "--device",
      udid,
      "--no-bundler",
    ],
    cwd,
  );

  if (!isHostInstalledOnSim(udid, entry.hostBundleId)) {
    throw new Error(
      `ensure-install: ${entry.hostBundleId} still missing after Release run:ios (${entry.path})`,
    );
  }

  ensuredThisRun.add(key);
  console.error(
    `[ensure-install] ${entry.id}: installed ${entry.hostBundleId}`,
  );
  return { skipped: false, built: true };
}

/** Test/helper: clear process cache (does not uninstall apps). */
export function clearEnsureInstallCache(): void {
  ensuredThisRun.clear();
}
