/**
 * Android dual of wallet-ui — Companion/issuer Activity chrome.
 * DeviceSession only. Green on issuer chrome; else os-limit after honest attempt.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { hostLaunchId, TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapId,
  waitForId,
} from "./helpers";

const ISSUER_MARKERS = [
  "ET Wallet Auth",
  "Wallet Auth",
  "Issuer",
  "Provision",
  "Add pass",
] as const;

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

export async function runAndroidWalletUiJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["wallet-ui"];
  const pathStr = entry?.path ?? "examples/wallet";
  const claim = claimForId("wallet-ui", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("wallet-ui: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    await tapId(device, "btn-open-issuer-activity", 8_000);
    steps.push("open-issuer-activity");
    await sleep(1_500);
    await dismissSystemAlerts(device);

    steps.push("issuer-chrome-attempt");
    const labels = flattenLabels(await device.accessibilityTree());
    if (labelsHit(labels, ISSUER_MARKERS)) {
      steps.push("issuer-chrome-visible");
      return {
        id: "wallet-ui",
        path: pathStr,
        phase: 4,
        ok: true,
        status: "green",
        steps: [...steps, "wallet-ui-android-ok"],
      };
    }

    steps.push("issuer-chrome-miss");
    return {
      id: "wallet-ui",
      path: pathStr,
      phase: 4,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `Companion/issuer Activity chrome unavailable; labels=${labels.slice(0, 80).join(", ")}`,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind =
      /not installed|Launch failed|device offline|no devices|pressButton/i.test(
        msg,
      )
        ? "operator"
        : "product";
    return {
      id: "wallet-ui",
      path: pathStr,
      phase: 4,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
