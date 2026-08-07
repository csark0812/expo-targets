/**
 * Android dual of spotlight-delegate — host registration status on named testID
 * (not dumpsys alone). DeviceSession only.
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

const REGISTRATION_TEST_ID = "text-registration-status";

export async function runAndroidSpotlightDelegateJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["spotlight-delegate"];
  const pathStr = entry?.path ?? "examples/spotlight-delegate";
  const claim = claimForId("spotlight-delegate", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("spotlight-delegate: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    await tapId(device, "btn-refresh-registration", 8_000);
    steps.push("refresh-registration");
    await sleep(400);

    steps.push("registration-status-attempt");
    try {
      await waitForId(device, REGISTRATION_TEST_ID, 6_000);
      steps.push("registration-testid-visible");
      await assertPayloadContains(
        device,
        REGISTRATION_TEST_ID,
        "appsearch:",
        4_000,
      );
      steps.push("registration-status-ok");
      return {
        id: "spotlight-delegate",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "spotlight-delegate-android-ok"],
      };
    } catch {
      steps.push("registration-status-miss");
    }

    return {
      id: "spotlight-delegate",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        "Host registration status testID missing after honest refresh attempt",
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
      id: "spotlight-delegate",
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
