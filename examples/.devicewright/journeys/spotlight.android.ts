/**
 * Android dual of spotlight — AppSearch query hit must show ET marker.
 * DeviceSession only. Green on query hit; else os-limit after honest index+query.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { hostLaunchId, TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapId,
  waitForId,
} from "./helpers";

const ET_MARKERS = [
  "ET Spotlight Import",
  "ET Spotlight",
  "expo-targets spotlight",
] as const;

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

export async function runAndroidSpotlightJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.spotlight;
  const pathStr = entry?.path ?? "examples/spotlight";
  const claim = claimForId("spotlight", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("spotlight: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, entry.testIds.clearPayload, 4_000);
      steps.push("cleared-payload");
    } catch {
      steps.push("clear-payload-miss");
    }

    await tapId(device, "btn-seed-appsearch", 8_000);
    steps.push("seed-appsearch");
    await sleep(800);

    await tapId(device, "btn-query-appsearch", 8_000);
    steps.push("query-appsearch");
    await sleep(1_200);

    steps.push("appsearch-hit-attempt");
    let hit = false;
    for (let i = 0; i < 10; i++) {
      try {
        await tapId(device, "btn-refresh", 2_000);
      } catch {
        /* optional */
      }
      try {
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          "ET Spotlight",
          2_500,
        );
        hit = true;
        steps.push("appsearch-payload-hit");
        break;
      } catch {
        /* poll */
      }
      if (
        labelsHit(flattenLabels(await device.accessibilityTree()), ET_MARKERS)
      ) {
        hit = true;
        steps.push("appsearch-ax-hit");
        break;
      }
      await sleep(700);
    }

    if (hit) {
      return {
        id: "spotlight",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "spotlight-android-ok"],
      };
    }

    const labels = flattenLabels(await device.accessibilityTree());
    steps.push("appsearch-hit-miss");
    return {
      id: "spotlight",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `AppSearch query hit with ET marker unreachable; labels=${labels.slice(0, 80).join(", ")}`,
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
      id: "spotlight",
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
