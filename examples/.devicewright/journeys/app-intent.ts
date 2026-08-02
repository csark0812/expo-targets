/**
 * App Intents (ExtensionKit) deep journey.
 *
 * Proves the appintents-extension appex is installed via pluginkit.
 * Shortcuts invoke is best-effort (launch Shortcuts and search host name).
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { dismissSystemAlerts, sleep, waitForNamed } from "./helpers";
import { tapLabelInTree } from "./settings-nav";

const SHORTCUTS_BUNDLE = "com.apple.shortcuts";

function pluginkitHasAppIntent(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /appintents-extension/i.test(out)
  );
}

export async function runAppIntentJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["app-intent"];
  const path = entry?.path ?? "examples/app-intent";
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("app-intent: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.app-intent`;
    if (!pluginkitHasAppIntent(device.deviceId, appexId)) {
      throw new Error(`App Intents appex missing from pluginkit (${appexId})`);
    }
    steps.push("pluginkit-app-intent");

    // Best-effort: Shortcuts lists host-provided actions when installed.
    try {
      await device.launchApp(SHORTCUTS_BUNDLE, { terminateRunning: true });
      steps.push("shortcuts-launch");
      await sleep(1200);
      const found = await tapLabelInTree(device, [
        entry.hostDisplayName,
        "ET AppIntent",
      ]);
      if (found) steps.push("shortcuts-host-visible");
      else steps.push("shortcuts-host-not-visible");
    } catch {
      steps.push("shortcuts-not-attempted");
    }

    return {
      id: "app-intent",
      path,
      phase: 5,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "app-intent",
      path,
      phase: 5,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
