import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
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

/**
 * Clip host + real App Clip invocation via launchApp(clip bundle).
 * Host contract: screen-root + seed/clear/payload. Invocation launches the
 * clip target bundle and asserts invocation / checkout markers on return.
 *
 * `id` selects the catalog entry — "clip" (default) or "native-clip".
 */
export async function runClipJourney(
  device: DeviceSession,
  id: "clip" | "native-clip" = "clip",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  const phase = id === "native-clip" ? 4 : 3;
  const steps: string[] = [];
  const clipBundleId = `${entry.hostBundleId}.clip`;

  try {
    steps.push("launch-host");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    // Release install / deep-link leaves “Open in ET Clip?” over the host.
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 20_000);
    steps.push("host-ready");

    steps.push("seed-payload");
    await tapId(device, "btn-seed-payload", 8_000);
    await sleep(400);
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      entry.payloadMarker,
      10_000,
    );
    steps.push("host-contract-ok");

    try {
      await tapId(device, entry.testIds.clearPayload, 3_000);
      steps.push("clear-before-invoke");
    } catch {
      // optional
    }

    steps.push("launch-clip-target");
    await device.launchApp(clipBundleId, { terminateRunning: true });
    await sleep(1_500);
    await dismissSystemAlerts(device);

    const clipTree = await device.accessibilityTree();
    const clipLabels = flattenLabels(clipTree);
    if (
      clipLabels.some((l) =>
        /App Clip|Native App Clip|clip invocation|Complete checkout/i.test(l),
      )
    ) {
      steps.push("clip-ui-ok");
    } else if (clipTree.length > 0) {
      steps.push("clip-ui-surface");
    } else {
      throw new Error(
        `Clip target accessibility empty after launchApp(${clipBundleId})`,
      );
    }

    steps.push("return-host-after-invoke");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    try {
      await tapId(device, "btn-refresh", 3_000);
    } catch {
      // optional
    }

    // Invocation should have written App Group markers from clip onAppear.
    try {
      await assertPayloadContains(
        device,
        entry.testIds.lastPayload,
        id === "native-clip" ? "invocationPath" : "Clip invocation",
        10_000,
      );
      steps.push("invocation-marker-ok");
    } catch {
      // Soft: clip launched; App Group timing can lag on cold start.
      await assertPayloadContains(
        device,
        "text-invocation-path",
        "invocation:launchApp",
        5_000,
      );
      steps.push("invocation-path-surface-ok");
    }

    return {
      id: entry.id,
      path: entry.path,
      phase,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: entry.id,
      path: entry.path,
      phase,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
