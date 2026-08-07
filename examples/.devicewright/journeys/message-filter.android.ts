/**
 * Android dual of message-filter — Filter settings UI must list this service.
 * S3a: Settings → Apps → Special app access / Default SMS / OEM Messages spam.
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

const SETTINGS_PKG = "com.android.settings";
const SERVICE_MARKERS = [
  "ET MsgFilter Target",
  "ET MsgFilter",
  "MsgFilter",
  "messagefilter",
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

async function openFilterSettings(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  await device.launchApp(SETTINGS_PKG, { terminateRunning: true });
  steps.push("settings-launch");
  await sleep(1_000);
  await dismissSystemAlerts(device);

  if (await tapNamed(device, ["Search settings", "Search"], 2_500)) {
    steps.push("settings-search-open");
    await sleep(400);
    try {
      await device.type("SMS");
      steps.push("settings-search:SMS");
      await sleep(1_000);
      if (
        await tapNamed(
          device,
          [
            "Default SMS app",
            "SMS",
            "Messaging",
            "Spam protection",
            "Special app access",
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
    "Apps",
    "Apps & notifications",
    "Special app access",
    "Special access",
    "Default apps",
    "SMS app",
    "Default SMS app",
    "Spam protection",
  ]) {
    if (await tapNamed(device, [label], 2_500)) {
      steps.push(`settings-drill:${label}`);
    }
  }
}

export async function runAndroidMessageFilterJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["message-filter"];
  const pathStr = entry?.path ?? "examples/message-filter";
  const claim = claimForId("message-filter", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("message-filter: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, "btn-open-filter-settings", 5_000);
      steps.push("host-open-filter-settings");
      await sleep(1_000);
      await dismissSystemAlerts(device);
    } catch {
      steps.push("host-open-filter-settings-miss");
      await openFilterSettings(device, steps);
    }

    // If host CTA only opened app-details, continue into system Settings hunt.
    if (!steps.some((s) => s.startsWith("settings-"))) {
      await openFilterSettings(device, steps);
    }

    steps.push("filter-settings-list-attempt");
    let listed = await waitForServiceListed(device, 8_000);
    if (!listed) {
      for (let i = 0; i < 5 && !listed; i++) {
        await scrollSettings(device);
        listed = await waitForServiceListed(device, 2_500);
      }
    }

    if (listed) {
      steps.push("message-filter-listed");
      return {
        id: "message-filter",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "message-filter-android-list-ok"],
      };
    }

    const labels = flattenLabels(await device.accessibilityTree());
    steps.push("message-filter-not-listed");
    return {
      id: "message-filter",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `Filter settings UI missing ET MsgFilter; labels=${labels.slice(0, 80).join(", ")}`,
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
      id: "message-filter",
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
