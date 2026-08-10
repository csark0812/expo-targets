/**
 * Wallet UI (authorization) companion journey.
 *
 * Generated alongside `wallet` when `ios.wallet.ui: true`. Proves the auth
 * appex is installed via pluginkit; PassKit issuer UI flow remains os-limit.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { dismissSystemAlerts, waitForNamed } from "./helpers";
import { runAndroidWalletUiJourney } from "./wallet-ui.android";

function pluginkitHasWalletUi(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /issuer-provisioning/i.test(out)
  );
}

export async function runWalletUiJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidWalletUiJourney(device);
  }
  const entry = TARGET_CATALOG["wallet-ui"];
  const path = entry?.path ?? "examples/wallet";
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("wallet-ui: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.wallet-ui`;
    if (!pluginkitHasWalletUi(device.deviceId, appexId)) {
      throw new Error(`Wallet UI appex missing from pluginkit (${appexId})`);
    }
    steps.push("pluginkit-wallet-ui");

    return {
      id: "wallet-ui",
      path,
      phase: 4,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error: "PassKit issuer provisioning requires Apple entitlement allow-list",
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "wallet-ui",
      path,
      phase: 4,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
