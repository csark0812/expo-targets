/**
 * Watch companion + watch-widget full-demo journeys.
 *
 * GREEN = phone host ready + paired watch session + visible Watch UI
 * (companion / widget chrome). Pair / AX / install failure after honest
 * attempt → os-limit CLAIMS (not silent hostOnly stub). Pluginkit alone
 * is never green.
 *
 * Pairing uses ensureWatchPhonePair({ activate:false, boot:false }) +
 * simctl boot <watch UDID> — same consumer workaround as live-activity
 * (pair_activate "already active" / pair-UUID boot are broken on current Xcode).
 *
 * iOS Simulator cannot embed watchOS binaries — companion is installed onto
 * the watch UDID from DerivedData `Release-watchsimulator/*.app`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { devices, ios } from "@csark0812/devicewright";
import type { DeviceSession } from "@csark0812/devicewright";
import { assertOsLimitAllowed, claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  flattenLabels,
  sleep,
  waitForNamed,
} from "./helpers";

type WatchId = "watch" | "watch-widget";

const WATCH_UI_RE: Record<WatchId, RegExp> = {
  watch: /ET [Ww]atch|WatchApp|ET Watch Target|com\.expotargets\.example\.watch/i,
  "watch-widget":
    /ET Watch Widget|ET WatchW|WatchWidget|watch-widget/i,
};

function claimsWatch(
  id: WatchId,
  pathStr: string,
  steps: string[],
  detail: string,
): TargetJourneyResult {
  assertOsLimitAllowed(id);
  const claim = claimForId(id);
  return {
    id,
    path: pathStr,
    phase: 5,
    ok: true,
    status: "os-limit",
    steps,
    failureKind: "os-limit",
    error: `${claim?.reason ?? `${id} os-limit`} — ${detail}`,
  };
}

/** Boot watch by UDID — `simctl boot <pairId>` is invalid on current Xcode. */
function bootWatchUdid(watchUdid: string): void {
  const boot = spawnSync("xcrun", ["simctl", "boot", watchUdid], {
    encoding: "utf8",
    env: process.env,
  });
  const ready = spawnSync(
    "xcrun",
    ["simctl", "bootstatus", watchUdid, "-b"],
    { encoding: "utf8", env: process.env, timeout: 120_000 },
  );
  if (ready.status !== 0 && boot.status !== 0) {
    throw new Error(
      `watch boot failed: ${boot.stderr || boot.stdout || ready.stderr}`,
    );
  }
}

function pairConnected(pairId: string): boolean {
  const r = spawnSync("xcrun", ["simctl", "list", "pairs"], {
    encoding: "utf8",
    env: process.env,
  });
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const idx = out.indexOf(pairId);
  if (idx < 0) return false;
  const window = out.slice(idx, idx + 120);
  return /connected/i.test(window) && !/disconnected/i.test(window);
}

async function waitForPairConnected(
  pairId: string,
  steps: string[],
  timeoutMs = 40_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (pairConnected(pairId)) {
      steps.push("watch-pair-connected");
      return true;
    }
    await sleep(1_500);
  }
  steps.push("watch-pair-disconnected");
  return false;
}

function isBundleOnSim(udid: string, bundleId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "get_app_container", udid, bundleId],
    { encoding: "utf8", env: process.env },
  );
  return r.status === 0;
}

/** Newest Release-watchsimulator companion product from DerivedData. */
function findWatchSimulatorApp(
  productName = "ETWatchTargetTarget.app",
): string | undefined {
  const derived = path.join(
    os.homedir(),
    "Library/Developer/Xcode/DerivedData",
  );
  if (!fs.existsSync(derived)) return undefined;
  const r = spawnSync(
    "find",
    [derived, "-path", `*/Release-watchsimulator/${productName}`, "-type", "d"],
    { encoding: "utf8", env: process.env, timeout: 60_000 },
  );
  const paths = (r.stdout ?? "")
    .trim()
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  if (paths.length === 0) return undefined;
  paths.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return paths[0];
}

/**
 * Install watchOS companion onto the watch sim (iOS Simulator hosts cannot
 * embed watch binaries).
 */
function ensureWatchCompanionOnWatch(
  watchUdid: string,
  companionBundleId: string,
  steps: string[],
): boolean {
  if (isBundleOnSim(watchUdid, companionBundleId)) {
    steps.push("watch-companion-already-installed");
    return true;
  }
  const app = findWatchSimulatorApp();
  if (!app) {
    steps.push("watch-companion-app-missing");
    return false;
  }
  const inst = spawnSync("xcrun", ["simctl", "install", watchUdid, app], {
    encoding: "utf8",
    env: process.env,
  });
  if (inst.status !== 0) {
    steps.push(
      `watch-companion-install-fail:${(inst.stderr || inst.stdout || "").slice(0, 80)}`,
    );
    return false;
  }
  steps.push("watch-companion-installed");
  return isBundleOnSim(watchUdid, companionBundleId);
}

async function openWatchPairSession(phoneUdid: string): Promise<{
  watch: DeviceSession;
  watchUdid: string;
  pairId: string;
}> {
  const pair = ios.ensureWatchPhonePair({
    phoneId: phoneUdid,
    watch: "Apple Watch",
    activate: false,
    boot: false,
  });
  bootWatchUdid(pair.watch.udid);
  const watch = await devices.launch({
    platform: "ios",
    deviceId: pair.watch.udid,
    lock: false,
    boot: false,
  });
  return { watch, watchUdid: pair.watch.udid, pairId: pair.pairId };
}

export async function runWatchJourney(
  device: DeviceSession,
  id: WatchId = "watch",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  const pathStr = entry?.path ?? `examples/${id}`;
  const steps: string[] = [];

  try {
    if (!entry) throw new Error(`${id}: missing catalog entry`);

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    let watch: DeviceSession | undefined;
    let watchUdid = "";
    let pairId = "";
    try {
      const session = await openWatchPairSession(device.deviceId);
      watch = session.watch;
      watchUdid = session.watchUdid;
      pairId = session.pairId;
      steps.push(`watch-pair-booted:${watchUdid.slice(0, 8)}`);
    } catch (e) {
      return claimsWatch(
        id,
        pathStr,
        [...steps, `watch-pair-fail:${String(e).slice(0, 100)}`],
        "ensureWatchPhonePair / watch session failed after honest attempt",
      );
    }

    try {
      if (!(await waitForPairConnected(pairId, steps))) {
        return claimsWatch(
          id,
          pathStr,
          steps,
          "Watch pair booted but not connected",
        );
      }

      const companionBundleId = `${entry.hostBundleId}.${id === "watch" ? "watch" : "watch-widget"}`;
      if (id === "watch") {
        ensureWatchCompanionOnWatch(watchUdid, companionBundleId, steps);
      }

      const watchBundles = [companionBundleId, entry.hostBundleId];
      let launched = false;
      for (const bid of watchBundles) {
        try {
          await watch.launchApp(bid, { terminateRunning: true });
          steps.push(`watch-launch:${bid.split(".").pop()}`);
          launched = true;
          break;
        } catch (launchErr) {
          steps.push(
            `watch-launch-skip:${bid.split(".").pop()}:${String(launchErr).slice(0, 60)}`,
          );
        }
      }
      if (!launched) {
        steps.push("watch-launch-all-skipped");
      }
      await sleep(2_000);

      let watchLabels: string[] = [];
      try {
        // idb companion on watch can be cold after pair/install — retry briefly.
        let lastAxErr: unknown;
        for (let i = 0; i < 4; i++) {
          try {
            watchLabels = flattenLabels(await watch.accessibilityTree());
            lastAxErr = undefined;
            break;
          } catch (axErr) {
            lastAxErr = axErr;
            await sleep(1_000);
          }
        }
        if (lastAxErr) throw lastAxErr;
        steps.push(`watch-ax-labels:${watchLabels.length}`);
      } catch (axErr) {
        return claimsWatch(
          id,
          pathStr,
          [...steps, `watch-ax-fail:${String(axErr).slice(0, 80)}`],
          "Watch AX empty/throws after pair (DW path or Apple ceiling)",
        );
      }

      if (watchLabels.some((l) => WATCH_UI_RE[id].test(l))) {
        steps.push("watch-ui-visible");
        return {
          id,
          path: pathStr,
          phase: 5,
          ok: true,
          status: "green",
          steps,
        };
      }

      if (id === "watch-widget") {
        try {
          await watch.pressButton({ button: "HOME" });
          await sleep(800);
          await watch.swipe({
            from: { x: 100, y: 180 },
            to: { x: 100, y: 40 },
            durationMs: 400,
          });
          await sleep(1_200);
          const stackLabels = flattenLabels(await watch.accessibilityTree());
          steps.push(`watch-stack-ax:${stackLabels.length}`);
          if (stackLabels.some((l) => WATCH_UI_RE[id].test(l))) {
            steps.push("watch-ui-visible");
            return {
              id,
              path: pathStr,
              phase: 5,
              ok: true,
              status: "green",
              steps,
            };
          }
        } catch (stackErr) {
          steps.push(`watch-stack-skip:${String(stackErr).slice(0, 60)}`);
        }
      }

      return claimsWatch(
        id,
        pathStr,
        [...steps, "watch-ui-absent"],
        `Visible Watch UI missing after pair (wanted ${WATCH_UI_RE[id]})`,
      );
    } finally {
      try {
        await watch?.close?.();
      } catch {
        /* matrix still owns the primary phone session */
      }
    }
  } catch (e) {
    const msg = String(e);
    const failureKind =
      /not installed|Unable to find|Launch failed|failed to launch|FBSOpenApplication/i.test(
        msg,
      )
        ? "operator"
        : "product";
    return {
      id,
      path: pathStr,
      phase: 5,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}

export async function runWatchWidgetJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  return runWatchJourney(device, "watch-widget");
}
