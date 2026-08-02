/**
 * File Provider UI deep journey.
 *
 * Proves the fileprovider-actionsui appex is installed via pluginkit.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { dismissSystemAlerts, waitForNamed } from "./helpers";

function pluginkitHasFileProviderUi(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /fileprovider-actionsui/i.test(out)
  );
}

export async function runFileProviderUiJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["file-provider-ui"];
  const path = entry?.path ?? "examples/file-provider-ui";
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("file-provider-ui: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.file-provider-ui`;
    if (!pluginkitHasFileProviderUi(device.deviceId, appexId)) {
      throw new Error(
        `File Provider UI appex missing from pluginkit (${appexId})`,
      );
    }
    steps.push("pluginkit-file-provider-ui");

    return {
      id: "file-provider-ui",
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
      id: "file-provider-ui",
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
