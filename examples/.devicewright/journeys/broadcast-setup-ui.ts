/**
 * Broadcast Setup UI extension deep journey — pluginkit proof.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { dismissSystemAlerts, waitForNamed } from "./helpers";

function pluginkitHasBroadcastSetupUi(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /broadcast-services-setupui/i.test(out)
  );
}

export async function runBroadcastSetupUiJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["broadcast-setup-ui"];
  const path = entry?.path ?? "examples/broadcast-setup-ui";
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("broadcast-setup-ui: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.broadcast-setup-ui`;
    if (!pluginkitHasBroadcastSetupUi(device.deviceId, appexId)) {
      throw new Error(
        `Broadcast setup UI appex missing from pluginkit (${appexId})`,
      );
    }
    steps.push("pluginkit-broadcast-setup-ui");

    return {
      id: "broadcast-setup-ui",
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
      id: "broadcast-setup-ui",
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
