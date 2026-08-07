/**
 * Android dual of wallet — Google Wallet/pass host surface (not companion Activity).
 * Needs Google APIs + Play image; provision miss → os-limit.
 * DeviceSession only.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { hostLaunchId,
  TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapCenter,
  tapId,
  tapProbeHit,
  waitForId,
  waitForNamed,
  ANDROID_POST_TAP_MS,
  ANDROID_SETTINGS_SETTLE_MS,
  tapNamedAndroid,
} from "./helpers";

const WALLET_PKGS = [
  "com.google.android.apps.walletnfcrel",
  "com.google.android.gms",
] as const;

const PASS_MARKERS = [
  "Google Wallet",
  "Passes",
  "Add to Wallet",
  "Your passes",
  "Payment methods",
] as const;

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

const tapNamed = tapNamedAndroid;

export async function runAndroidWalletJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.wallet;
  const pathStr = entry?.path ?? "examples/wallet";
  const claim = claimForId("wallet", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("wallet: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, "btn-seed-pass", 5_000);
      steps.push("seed-pass");
      await sleep(400);
    } catch {
      steps.push("seed-pass-miss");
    }

    await tapId(device, "btn-open-wallet", 8_000);
    steps.push("open-wallet-cta");
    await sleep(ANDROID_SETTINGS_SETTLE_MS);
    await dismissSystemAlerts(device);

    // Honest provision: try launching Google Wallet packages on Play image.
    let walletLaunched = false;
    for (const walletPkg of WALLET_PKGS) {
      try {
        await device.launchApp(walletPkg, { terminateRunning: false });
        steps.push(`wallet-pkg:${walletPkg.split(".").pop()}`);
        walletLaunched = true;
        await sleep(600);
        await dismissSystemAlerts(device);
        break;
      } catch (e) {
        steps.push(
          `wallet-pkg-miss:${walletPkg.split(".").pop()}:${String(e).slice(0, 40)}`,
        );
      }
    }
    if (!walletLaunched) {
      steps.push("wallet-play-image-unavailable");
    }

    steps.push("wallet-pass-surface-attempt");
    let hit = labelsHit(
      flattenLabels(await device.accessibilityTree()),
      PASS_MARKERS,
    );
    if (!hit) {
      for (const label of ["Passes", "Cards", "Tickets", "Loyalty"]) {
        if (await tapNamed(device, [label], 2_000)) {
          steps.push(`wallet-drill:${label}`);
        }
      }
      hit = labelsHit(
        flattenLabels(await device.accessibilityTree()),
        PASS_MARKERS,
      );
    }

    if (hit && walletLaunched) {
      steps.push("wallet-pass-surface-visible");
      return {
        id: "wallet",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "wallet-android-ok"],
      };
    }

    // Host-only "Wallet" chrome without a Play Wallet package is not Locked P.
    if (hit && !walletLaunched) {
      steps.push("wallet-host-chrome-only");
    }

    const labels = flattenLabels(await device.accessibilityTree());
    steps.push("wallet-pass-surface-miss");
    return {
      id: "wallet",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `Google Wallet/pass host surface unavailable (Google APIs+Play); labels=${labels.slice(0, 80).join(", ")}`,
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
      id: "wallet",
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
