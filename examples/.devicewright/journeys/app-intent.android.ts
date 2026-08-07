/**
 * Android dual of app-intent — App Actions/shortcuts list must show ET shortcut.
 * DeviceSession only. Green on ET shortcut row; else os-limit after honest attempt.
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

const SHORTCUT_MARKERS = [
  "ET Greet",
  "ET AppIntent",
  "Say Hello",
  "ET AppIntent Target",
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

async function waitForShortcutListed(
  device: DeviceSession,
  timeoutMs = 10_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (
      labelsHit(flattenLabels(await device.accessibilityTree()), SHORTCUT_MARKERS)
    ) {
      return true;
    }
    await sleep(400);
  }
  return false;
}

export async function runAndroidAppIntentJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["app-intent"];
  const pathStr = entry?.path ?? "examples/app-intent";
  const claim = claimForId("app-intent", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("app-intent: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, "btn-seed-shortcut", 5_000);
      steps.push("seed-shortcut");
      await sleep(400);
    } catch {
      steps.push("seed-shortcut-miss");
    }

    await tapId(device, "btn-open-app-actions", 8_000);
    steps.push("open-app-actions");
    await sleep(1_200);
    await dismissSystemAlerts(device);

    for (const label of [
      "App Actions",
      "Shortcuts",
      "Assistant",
      "Google Assistant",
      "Apps",
    ]) {
      if (await tapNamed(device, [label], 2_500)) {
        steps.push(`actions-drill:${label}`);
      }
    }

    steps.push("app-actions-list-attempt");
    let listed = await waitForShortcutListed(device, 8_000);
    if (!listed) {
      for (let i = 0; i < 4 && !listed; i++) {
        await device.swipe({
          xStart: 540,
          yStart: 1600,
          xEnd: 540,
          yEnd: 600,
          duration: 0.35,
        });
        await sleep(500);
        listed = await waitForShortcutListed(device, 2_500);
      }
    }

    if (listed) {
      steps.push("et-shortcut-listed");
      return {
        id: "app-intent",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "app-intent-android-list-ok"],
      };
    }

    const labels = flattenLabels(await device.accessibilityTree());
    steps.push("et-shortcut-not-listed");
    return {
      id: "app-intent",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `App Actions/shortcuts missing ET row; labels=${labels.slice(0, 80).join(", ")}`,
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
      id: "app-intent",
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
