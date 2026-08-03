/**
 * Live Activity journey (Trick showcase).
 *
 * GREEN = host ActivityKit start (live id ≠ none) + update (status reflects) + endAll.
 * Lock Screen preferred when visible. Watch chrome via launchWatchPhonePair when pair boots.
 * Pluginkit-only ≠ green. DI / push / StandBy remain CLAIMS.
 */
import { launchWatchPhonePair } from "@csark0812/devicewright";
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapId,
  tapProbeHit,
  waitForId,
  waitForNamed,
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
    await sleep(800);
    await dismissSystemAlerts(device);
    try {
      await waitForId(device, hostReadyTestId(entry.testIds), 25_000);
    } catch {
      await waitForNamed(device, ["ready"], 15_000);
    }
    steps.push("host-ready");

    await tapId(device, "btn-start-live", 10_000);
    await sleep(1_200);
    steps.push("start-live");

    let tree = await device.accessibilityTree();
    let labels = flattenLabels(tree);
    const liveLine = labels.find((l) => /live activity:/i.test(l));
    const started =
      Boolean(liveLine && !/live activity:\s*none/i.test(liveLine)) ||
      labels.some((l) => /live activity [0-9A-F-]{8,}/i.test(l));

    if (!started) {
      const claim = claimForId("live-activity");
      return {
        id: "live-activity",
        path: pathStr,
        phase: 3,
        ok: false,
        status: "red",
        steps,
        error:
          claim?.reason ??
          "Live Activity host id not set (pluginkit-only is not green)",
        failureKind: "product",
      };
    }
    steps.push("live-id-set");

    try {
      await tapId(device, "btn-update-live", 8_000);
    } catch {
      const hit = await findNamedViaPointProbe(
        device,
        ["Update Live Activity", "btn-update-live"],
        { timeoutMs: 8_000, yStartRatio: 0.2, yEndRatio: 0.85 },
      );
      await tapProbeHit(device, hit);
    }
    await sleep(1_000);
    steps.push("update-live");
    tree = await device.accessibilityTree();
    labels = flattenLabels(tree);
    const updated =
      labels.some((l) => /live status:\s*updated/i.test(l)) ||
      labels.some((l) => /Live Activity updated/i.test(l));
    if (!updated) {
      throw new Error(
        `Live Activity update did not reflect; labels=${labels.slice(0, 40).join(", ")}`,
      );
    }
    steps.push("update-status-reflected");

    await device.pressButton({ button: "LOCK" });
    await sleep(1_000);
    steps.push("lock-screen");
    const lockLabels = flattenLabels(await device.accessibilityTree());
    if (
      lockLabels.some((l) => /ET Trick Live|ET Trick|active|updated/i.test(l))
    ) {
      steps.push("lock-activity-visible");
    }

    // Watch operator-proof (never CI-must): try pair; S3a→CLAIMS on miss.
    try {
      const pair = await launchWatchPhonePair();
      steps.push("watch-pair-booted");
      await sleep(2_000);
      const watchLabels = flattenLabels(await pair.watch.accessibilityTree());
      if (
        watchLabels.some((l) =>
          /ET Trick Live|ET Trick|active|updated/i.test(l),
        )
      ) {
        steps.push("watch-activity-visible");
      } else {
        steps.push("watch-chrome-absent");
      }
      try {
        await pair.watch.close?.();
      } catch {
        /* optional */
      }
    } catch (e) {
      steps.push(`watch-pair-skip:${String(e).slice(0, 80)}`);
    }

    await device.pressButton({ button: "HOME" }).catch(() => undefined);
    await sleep(500);
    await device.launchApp(entry.hostBundleId);
    await dismissSystemAlerts(device);
    await sleep(600);
    try {
      await waitForId(device, "btn-end-live", 12_000);
    } catch {
      await waitForNamed(device, ["ready", "End Live Activities"], 12_000);
    }
    try {
      await tapId(device, "btn-end-live", 8_000);
    } catch {
      const end = await findNamedViaPointProbe(device, ["End Live Activities"], {
        timeoutMs: 8_000,
        yStartRatio: 0.2,
        yEndRatio: 0.85,
      });
      await tapProbeHit(device, end);
    }
    await sleep(800);
    steps.push("end-live");
    const endLabels = flattenLabels(await device.accessibilityTree());
    if (endLabels.some((l) => /live activity:\s*none/i.test(l))) {
      steps.push("end-confirmed");
    }

    return {
      id: "live-activity",
      path: pathStr,
      phase: 3,
      ok: true,
      status: "green",
      steps,
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
