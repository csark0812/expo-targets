import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  hostReadyTestId,
  sleep,
  tapId,
  waitForId,
} from "./helpers";

const SPRINGBOARD = "com.apple.springboard";

/**
 * Widgets host contract + SpringBoard gallery surface probe.
 */
export async function runWidgetsJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.widgets;
  const steps: string[] = [];
  try {
    steps.push("launch-host");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
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

    steps.push("springboard-probe");
    await device.launchApp(SPRINGBOARD, { terminateRunning: false });
    await sleep(800);
    const tree = await device.accessibilityTree();
    if (tree.length === 0) {
      throw new Error("SpringBoard tree empty (widgets gallery probe)");
    }
    steps.push("gallery-surface-ok");

    return {
      id: entry.id,
      path: entry.path,
      phase: 3,
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
      phase: 3,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
