import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  hostReadyTestId,
  sleep,
  tapId,
  waitForId,
} from "./helpers";

const SAFARI_BUNDLE = "com.apple.mobilesafari";

/**
 * Clip host + invocation as far as idb allows.
 * Host contract: screen-root + seed/clear/payload. Invocation via Safari soft probe.
 *
 * `id` selects the catalog entry — "clip" (default) or "native-clip" (same
 * App-Clip-shaped host contract, distinct bundle id / example path).
 */
export async function runClipJourney(
  device: DeviceSession,
  id: "clip" | "native-clip" = "clip",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  const phase = id === "native-clip" ? 4 : 3;
  const steps: string[] = [];
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
    // text-last-payload often has no AXUniqueId — assert via labels.
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      entry.payloadMarker,
      10_000,
    );
    steps.push("host-contract-ok");

    steps.push("safari-probe");
    await device.launchApp(SAFARI_BUNDLE, { terminateRunning: true });
    await sleep(800);
    const tree = await device.accessibilityTree();
    if (tree.length === 0) {
      throw new Error("Safari accessibility tree empty (clip surface probe)");
    }
    steps.push("invocation-surface-ok");

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
