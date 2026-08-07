/**
 * Android dual of print-service — Print services Settings must list this service.
 * S3a: Settings → Connected devices → Connection preferences → Printing.
 * DeviceSession only. Green on label list; else os-limit after honest attempt.
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

const SERVICE_MARKERS = [
  "ET Print Target",
  "ET Print",
  "PrintService",
  "printservice",
] as const;

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

const tapNamed = tapNamedAndroid;

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

export async function runAndroidPrintServiceJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["print-service"];
  const pathStr = entry?.path ?? "examples/print-service";
  const claim = claimForId("print-service", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("print-service: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    await tapId(device, "btn-open-print-settings", 8_000);
    steps.push("open-print-settings");
    await sleep(ANDROID_SETTINGS_SETTLE_MS);
    await dismissSystemAlerts(device);

    for (const label of [
      "Printing",
      "Print services",
      "Default print service",
      "Connected devices",
      "Connection preferences",
      "More connection settings",
    ]) {
      if (await tapNamed(device, [label], 2_500)) {
        steps.push(`settings-drill:${label}`);
      }
    }

    steps.push("print-services-list-attempt");
    let listed = await waitForServiceListed(device, 10_000);
    if (!listed) {
      for (let i = 0; i < 4 && !listed; i++) {
        await scrollSettings(device);
        listed = await waitForServiceListed(device, 3_000);
      }
    }

    if (listed) {
      steps.push("print-service-listed");
      return {
        id: "print-service",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "print-service-android-list-ok"],
      };
    }

    const labels = flattenLabels(await device.accessibilityTree());
    steps.push("print-service-not-listed");
    return {
      id: "print-service",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `Print services Settings missing ET Print; labels=${labels.slice(0, 80).join(", ")}`,
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
      id: "print-service",
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
