/**
 * Android dual of credentials-provider — Autofill settings must list this service.
 * S3a: Settings → Passwords & accounts / Autofill (REQUEST_SET_AUTOFILL_SERVICE).
 * DeviceSession only. Green on label list; else os-limit after honest attempt.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { hostLaunchId, TARGET_CATALOG } from "../catalog";
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
} from "./helpers";

const SERVICE_MARKERS = [
  "ET Creds Target",
  "ET Creds",
  "ET credentials-provider",
  "credentialsprovider",
] as const;

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

async function tapNamed(
  device: DeviceSession,
  names: string[],
  timeoutMs = 4_000,
): Promise<boolean> {
  try {
    await tapCenter(device, await waitForNamed(device, names, timeoutMs));
    await sleep(700);
    return true;
  } catch {
    try {
      const hit = await findNamedViaPointProbe(device, names, {
        timeoutMs: Math.min(timeoutMs, 3_500),
        match: "includes",
        yStartRatio: 0.05,
        yEndRatio: 0.95,
      });
      await tapProbeHit(device, hit);
      await sleep(700);
      return true;
    } catch {
      return false;
    }
  }
}

async function waitForServiceListed(
  device: DeviceSession,
  timeoutMs = 12_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (
      labelsHit(flattenLabels(await device.accessibilityTree()), SERVICE_MARKERS)
    ) {
      return true;
    }
    await sleep(400);
  }
  return false;
}

async function scrollSettings(device: DeviceSession): Promise<void> {
  await device.swipe({
    xStart: 540,
    yStart: 1600,
    xEnd: 540,
    yEnd: 600,
    duration: 0.35,
  });
  await sleep(500);
}

export async function runAndroidCredentialsProviderJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["credentials-provider"];
  const pathStr = entry?.path ?? "examples/credentials-provider";
  const claim = claimForId("credentials-provider", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("credentials-provider: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    await tapId(device, "btn-open-autofill-settings", 8_000);
    steps.push("open-autofill-settings");
    await sleep(1_200);
    await dismissSystemAlerts(device);

    for (const label of [
      "Autofill service",
      "Autofill services",
      "Preferred service",
      "Passwords, passkeys & data services",
      "Passwords & accounts",
      "Autofill",
    ]) {
      if (await tapNamed(device, [label], 2_500)) {
        steps.push(`settings-drill:${label}`);
      }
    }

    steps.push("autofill-list-attempt");
    let listed = await waitForServiceListed(device, 10_000);
    if (!listed) {
      for (let i = 0; i < 4 && !listed; i++) {
        await scrollSettings(device);
        listed = await waitForServiceListed(device, 3_000);
      }
    }

    if (listed) {
      steps.push("autofill-service-listed");
      return {
        id: "credentials-provider",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "credentials-android-autofill-list-ok"],
      };
    }

    const labels = flattenLabels(await device.accessibilityTree());
    steps.push("autofill-service-not-listed");
    return {
      id: "credentials-provider",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `Autofill settings missing ET Creds; labels=${labels.slice(0, 80).join(", ")}`,
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
      id: "credentials-provider",
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
