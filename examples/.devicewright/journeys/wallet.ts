/**
 * Wallet (PassKit / Google Wallet) journey.
 * Android: Google Wallet/pass host surface. iOS: host contract floor (PassKit).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { dismissSystemAlerts, waitForNamed } from "./helpers";
import { runAndroidWalletJourney } from "./wallet.android";

export async function runWalletJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidWalletJourney(device);
  }

  const entry = TARGET_CATALOG.wallet;
  const path = entry?.path ?? "examples/wallet";
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("wallet: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    return {
      id: "wallet",
      path,
      phase: 4,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        "PassKit issuer / wallet surface requires Apple entitlement allow-list",
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "wallet",
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
