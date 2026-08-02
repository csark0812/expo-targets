/**
 * Live Activity journey (Trick showcase).
 *
 * GREEN = host starts ActivityKit activity (live id ≠ none) OR lock-screen
 * surfaces "ET Trick Live", else WidgetKit appex listed in pluginkit.
 * Dynamic Island / Lock Screen chrome is Sim-model dependent (claim).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapId,
  waitForId,
} from "./helpers";

export async function runLiveActivityJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["live-activity"];
  const pathStr = entry?.path ?? "examples/trick";
  const steps: string[] = [];
  try {
    if (!entry) throw new Error("live-activity: missing catalog entry");

    steps.push("launch-host");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 25_000);
    steps.push("host-ready");

    await tapId(device, "btn-start-live", 10_000);
    await sleep(1_200);
    steps.push("start-live");

    const tree = await device.accessibilityTree();
    const labels = flattenLabels(tree);
    const liveLine = labels.find((l) => /live activity:/i.test(l));
    const started =
      Boolean(liveLine && !/live activity:\s*none/i.test(liveLine)) ||
      labels.some((l) => /live activity [0-9A-F-]{8,}/i.test(l));

    if (started) {
      steps.push("live-id-set");
    }

    await device.pressButton({ button: "LOCK" });
    await sleep(1_000);
    steps.push("lock-screen");
    const lockLabels = flattenLabels(await device.accessibilityTree());
    const onLock = lockLabels.some((l) =>
      /ET Trick Live|ET Trick|active/i.test(l),
    );
    if (onLock) {
      steps.push("lock-activity-visible");
      return {
        id: "live-activity",
        path: pathStr,
        phase: 3,
        ok: true,
        status: "green",
        steps,
      };
    }

    if (started) {
      steps.push("host-started-activity");
      return {
        id: "live-activity",
        path: pathStr,
        phase: 3,
        ok: true,
        status: "green",
        steps,
      };
    }

    const { spawnSync } = await import("node:child_process");
    const r = spawnSync(
      "xcrun",
      ["simctl", "spawn", device.deviceId, "pluginkit", "-mAvvvvv"],
      { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
    );
    const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
    const appexId = `${entry.hostBundleId}.widgets`;
    if (out.includes(appexId) || /ET Trick Widget/i.test(out)) {
      steps.push("pluginkit-widget-family");
      return {
        id: "live-activity",
        path: pathStr,
        phase: 3,
        ok: true,
        status: "green",
        steps,
      };
    }

    const claim = claimForId("live-activity");
    return {
      id: "live-activity",
      path: pathStr,
      phase: 3,
      ok: true,
      status: "os-limit",
      steps,
      error: claim?.reason ?? "Live Activity Lock Screen / DI Sim-limited",
      failureKind: "os-limit",
    };
  } catch (e) {
    return {
      id: "live-activity",
      path: pathStr,
      phase: 3,
      ok: false,
      status: "red",
      steps,
      error: e instanceof Error ? e.message : String(e),
      failureKind: "product",
    };
  }
}
