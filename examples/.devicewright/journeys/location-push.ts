/**
 * Location Push Service deep journey.
 *
 * GREEN = pluginkit lists `com.apple.location.push.service` appex.
 * Push delivery requires a special entitlement — os-limit after appex proof.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { dismissSystemAlerts, waitForNamed } from "./helpers";

function pluginkitHasLocationPush(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /location\.push\.service/i.test(out)
  );
}

export async function runLocationPushJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["location-push"];
  const path = entry?.path ?? "examples/location-push";
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("location-push: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.location-push`;
    if (!pluginkitHasLocationPush(device.deviceId, appexId)) {
      throw new Error(`Location push appex missing from pluginkit (${appexId})`);
    }
    steps.push("pluginkit-location-push");

    return {
      id: "location-push",
      path,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error: "Location push special entitlement — delivery not attempted",
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "location-push",
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
