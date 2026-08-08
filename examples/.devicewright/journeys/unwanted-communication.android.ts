/**
 * Android dual of unwanted-communication — Reporting/screening extras UI lists service.
 * S3a: Settings → Safety / Call screening & spam extras / OEM reporting picker.
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

const SETTINGS_PKG = "com.android.settings";
const SERVICE_MARKERS = [
  "ET Unwanted Target",
  "ET Unwanted",
  "Unwanted",
  "unwantedcommunication",
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
  timeoutMs = 10_000,
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

async function openScreeningExtras(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  await device.launchApp(SETTINGS_PKG, { terminateRunning: true });
  steps.push("settings-launch");
  await sleep(450);
  await dismissSystemAlerts(device);

  if (await tapNamed(device, ["Search settings", "Search"], 2_500)) {
    steps.push("settings-search-open");
    await sleep(400);
    try {
      await device.type("Call screening");
      steps.push("settings-search:Call screening");
      await sleep(450);
      if (
        await tapNamed(
          device,
          [
            "Caller ID & spam",
            "Call screening",
            "Call screening & spam",
            "Safety",
            "Spam",
          ],
          3_000,
        )
      ) {
        steps.push("settings-search-result");
        return;
      }
    } catch {
      steps.push("settings-search-type-miss");
    }
  }

  for (const label of [
    "Safety",
    "Security & privacy",
    "Apps",
    "Apps & notifications",
    "Special app access",
    "Caller ID & spam",
    "Call screening",
    "Call screening & spam",
    "Spam",
  ]) {
    if (await tapNamed(device, [label], 2_500)) {
      steps.push(`settings-drill:${label}`);
    }
  }
}

export async function runAndroidUnwantedCommunicationJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["unwanted-communication"];
  const pathStr = entry?.path ?? "examples/unwanted-communication";
  const claim = claimForId("unwanted-communication", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("unwanted-communication: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, "btn-open-screening-settings", 5_000);
      steps.push("host-open-screening-settings");
      await sleep(450);
      await dismissSystemAlerts(device);
    } catch {
      steps.push("host-open-screening-settings-miss");
    }

    await openScreeningExtras(device, steps);
    steps.push("screening-extras-list-attempt");

    let listed = await waitForServiceListed(device, 8_000);
    if (!listed) {
      for (let i = 0; i < 5 && !listed; i++) {
        await scrollSettings(device);
        listed = await waitForServiceListed(device, 2_500);
      }
    }

    if (listed) {
      steps.push("unwanted-communication-listed");
      return {
        id: "unwanted-communication",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "unwanted-communication-android-list-ok"],
      };
    }

    const labels = flattenLabels(await device.accessibilityTree());
    steps.push("unwanted-communication-not-listed");
    return {
      id: "unwanted-communication",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `Reporting/screening extras missing ET Unwanted; labels=${labels.slice(0, 80).join(", ")}`,
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
      id: "unwanted-communication",
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
