/**
 * Opt-in Release ensure-install for REQUIRED_V1 hosts.
 * When a host bundle is missing on the sim, prebuild (if needed) +
 * `expo run:ios --configuration Release`.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
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
 * Pre-approve a URL scheme so `simctl openurl` skips “Open in …?”.
 * Mirrors Expo CLI’s `updateSimulatorLinkingPermissionsAsync` (often races).
 */
function approveSimulatorDeepLink(
  udid: string,
  scheme: string,
  appId: string,
): void {
  const plistPath = path.join(
    os.homedir(),
    "Library/Developer/CoreSimulator/Devices",
    udid,
    "data/Library/Preferences/com.apple.launchservices.schemeapproval.plist",
  );
  const key = `com.apple.CoreSimulator.CoreSimulatorBridge-->${scheme}`;
  const py = `
import plistlib, pathlib, sys
p = pathlib.Path(sys.argv[1])
data = plistlib.loads(p.read_bytes()) if p.exists() else {}
data[sys.argv[2]] = sys.argv[3]
p.parent.mkdir(parents=True, exist_ok=True)
p.write_bytes(plistlib.dumps(data, fmt=plistlib.FMT_BINARY))
`;
  const r = spawnSync("python3", ["-c", py, plistPath, key, appId], {
    encoding: "utf8",
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(
      `[ensure-install] scheme-approval failed for ${scheme}: ${r.stderr || r.stdout}`,
    );
  }
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

  // expo run:ios opens `{bundleId}://expo-development-client/...` via openurl.
  approveSimulatorDeepLink(udid, entry.hostBundleId, entry.hostBundleId);

  try {
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
  } catch (e) {
    // Build+install often succeeds; simctl openurl then fails (115) when the
    // Simulator is busy or rejects the metro deep link. Continue if installed.
    if (!isHostInstalledOnSim(udid, entry.hostBundleId)) {
      throw e;
    }
    console.error(
      `[ensure-install] ${entry.id}: run:ios exited but ${entry.hostBundleId} is installed — continuing`,
    );
  }

  if (!isHostInstalledOnSim(udid, entry.hostBundleId)) {
    throw new Error(
      `ensure-install: ${entry.hostBundleId} still missing after Release run:ios (${entry.path})`,
    );
  }

  // expo run:ios launches via openCustomRuntimeAsync → simctl openurl (exp+/scheme).
  // That surfaces Simulator “Open in …?”; terminate so journeys can launch by bundle id.
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

/** Test/helper: clear process cache (does not uninstall apps). */
export function clearEnsureInstallCache(): void {
  ensuredThisRun.clear();
}
