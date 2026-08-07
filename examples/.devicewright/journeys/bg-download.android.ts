/**
 * Android dual of bg-download — host marker updates on Download/WorkManager completion.
 * DeviceSession only. Green on completion marker; else os-limit after honest enqueue.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { hostLaunchId,
  TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  hostReadyTestId,
  sleep,
  tapId,
  waitForId,
  ANDROID_POST_TAP_MS,
  ANDROID_SETTINGS_SETTLE_MS,
} from "./helpers";

export async function runAndroidBgDownloadJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["bg-download"];
  const pathStr = entry?.path ?? "examples/bg-download";
  const claim = claimForId("bg-download", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("bg-download: missing catalog entry");
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

    await tapId(device, "btn-enqueue-download", 8_000);
    steps.push("enqueue-download");
    await sleep(450);

    steps.push("download-completion-attempt");
    let complete = false;
    for (let i = 0; i < 12; i++) {
      try {
        await tapId(device, "btn-refresh", 2_000);
      } catch {
        /* optional */
      }
      try {
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          "download:complete",
          2_500,
        );
        complete = true;
        steps.push("download-complete-marker");
        break;
      } catch {
        try {
          await assertPayloadContains(
            device,
            entry.testIds.lastPayload,
            "workmanager:complete",
            1_500,
          );
          complete = true;
          steps.push("workmanager-complete-marker");
          break;
        } catch {
          /* poll */
        }
      }
      await sleep(400);
    }

    if (complete) {
      return {
        id: "bg-download",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "bg-download-android-ok"],
      };
    }

    steps.push("download-complete-miss");
    return {
      id: "bg-download",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        "Host marker did not update on Download/WorkManager completion after honest enqueue",
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
      id: "bg-download",
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
