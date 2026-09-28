/**
 * Opt-in Release ensure-install for REQUIRED_V1 hosts.
 * When a host bundle is missing on the sim, prebuild (if needed) +
 * an unsigned simulator Release build + `simctl install`.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { TARGET_CATALOG } from "./catalog";
import { exampleAbsPath, exampleExists, repoRoot } from "./root";

const ensuredThisRun = new Set<string>();

export type EnsureHostReleaseInstallOptions = {
  id: string;
  deviceId: string;
};

export type EnsureAndroidReleaseInstallsOptions = {
  ids: readonly string[];
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
  completeWhen?: () => boolean,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const child = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      env: { ...process.env, CI: "1" },
    });
    const poll = completeWhen
      ? setInterval(() => {
          if (settled || !completeWhen()) return;
          settled = true;
          clearInterval(poll);
          // Expo CLI can remain at its post-install "Connecting" phase even
          // with --no-bundler. The installed Release bundle is this helper's
          // success condition, so do not keep the operator matrix hostage to
          // that unrelated foreground connection.
          child.kill("SIGTERM");
          resolve();
        }, 1_000)
      : undefined;
    poll?.unref();
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      if (poll) clearInterval(poll);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      if (poll) clearInterval(poll);
      if (code === 0) resolve();
      else {
        reject(
          new Error(`${cmd} ${args.join(" ")} exited ${code} (cwd=${cwd})`),
        );
      }
    });
  });
}

function simulatorAppWithBundleId(
  productsDir: string,
  bundleId: string,
): string | undefined {
  if (!fs.existsSync(productsDir)) return undefined;
  for (const name of fs.readdirSync(productsDir)) {
    if (!name.endsWith(".app")) continue;
    const appPath = path.join(productsDir, name);
    const result = spawnSync(
      "xcrun",
      [
        "plutil",
        "-extract",
        "CFBundleIdentifier",
        "raw",
        "-o",
        "-",
        path.join(appPath, "Info.plist"),
      ],
      { encoding: "utf8", env: process.env },
    );
    if (result.status === 0 && result.stdout.trim() === bundleId) return appPath;
  }
  return undefined;
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

  const workspaces = fs
    .readdirSync(iosDir)
    .filter((name) => name.endsWith(".xcworkspace") && name !== "Pods.xcworkspace");
  if (workspaces.length !== 1) {
    throw new Error(
      `ensure-install: expected one app workspace in ${iosDir}, found ${workspaces.join(", ") || "none"}`,
    );
  }
  const workspace = workspaces[0];
  const scheme = path.basename(workspace, ".xcworkspace");
  const derivedData = path.join(iosDir, ".agent-device-derived-data");
  await runStreaming(
    "xcodebuild",
    [
      "-workspace",
      workspace,
      "-scheme",
      scheme,
      "-configuration",
      "Release",
      "-sdk",
      "iphonesimulator",
      "-destination",
      `platform=iOS Simulator,id=${udid}`,
      "-derivedDataPath",
      derivedData,
      "CODE_SIGNING_ALLOWED=NO",
      "-quiet",
      "build",
    ],
    iosDir,
  );
  const productsDir = path.join(
    derivedData,
    "Build",
    "Products",
    "Release-iphonesimulator",
  );
  const appPath = simulatorAppWithBundleId(productsDir, entry.hostBundleId);
  if (!appPath) {
    throw new Error(
      `ensure-install: Release product for ${entry.hostBundleId} not found in ${productsDir}`,
    );
  }
  await runStreaming("xcrun", ["simctl", "install", udid, appPath], cwd);

  if (!isHostInstalledOnSim(udid, entry.hostBundleId)) {
    throw new Error(
      `ensure-install: ${entry.hostBundleId} still missing after simulator install (${entry.path})`,
    );
  }

  // Leave a deterministic stopped host for journeys to launch by bundle id.
  spawnSync("xcrun", ["simctl", "terminate", udid, entry.hostBundleId], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  ensuredThisRun.add(key);
  console.error(
    `[ensure-install] ${entry.id}: installed ${entry.hostBundleId}`,
  );
  return { skipped: false, built: true };
}

/**
 * Build and install the selected Android Release hosts before a live matrix.
 * Android installation is intentionally one batch: several required rows share
 * a host, and the repository script owns prebuild, Gradle, APK selection, and
 * adb installation for the complete closed set.
 */
export async function ensureAndroidReleaseInstalls(
  options: EnsureAndroidReleaseInstallsOptions,
): Promise<void> {
  if (options.ids.length === 0) return;
  await runStreaming(
    "bun",
    [
      path.join(repoRoot(), "scripts/android-install-required.ts"),
      `--device=${options.deviceId}`,
      `--ids=${[...new Set(options.ids)].join(",")}`,
    ],
    repoRoot(),
  );
}

/** Test/helper: clear process cache (does not uninstall apps). */
export function clearEnsureInstallCache(): void {
  ensuredThisRun.clear();
}
