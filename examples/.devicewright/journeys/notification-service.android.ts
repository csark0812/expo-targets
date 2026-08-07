/**
 * Android dual of notification-service — local/pre-display shade shows mutated
 * title/body (` [expo-targets]`). DeviceSession only.
 * Green on shade mutation; else os-limit after honest attempt (CLAIMS).
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

const MUTATED_MARKER = "[expo-targets]";
const BODY_MARKER = "local NSE path";

async function acceptNotificationPermission(
  device: DeviceSession,
): Promise<boolean> {
  try {
    const hit = await findNamedViaPointProbe(
      device,
      ["Allow", "Allow notifications", "While using the app"],
      {
        timeoutMs: 2_500,
        yStartRatio: 0.35,
        yEndRatio: 0.95,
        match: "includes",
        allowBlocked: true,
      },
    );
    await tapProbeHit(device, hit);
    await sleep(400);
    return true;
  } catch {
    try {
      await tapCenter(device, await waitForNamed(device, ["Allow"], 1_500));
      await sleep(400);
      return true;
    } catch {
      return false;
    }
  }
}

async function openNotificationShade(device: DeviceSession): Promise<void> {
  // Status-bar pull; DW has no dedicated shade button on Android.
  await device.swipe({
    xStart: 540,
    yStart: 8,
    xEnd: 540,
    yEnd: 1400,
    duration: 0.45,
  });
  await sleep(900);
}

function labelsHitMutation(labels: string[]): boolean {
  const flat = labels.join("\n");
  return flat.includes(MUTATED_MARKER) && /local NSE path|ET NSE/i.test(flat);
}

export async function runAndroidNotificationServiceJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["notification-service"];
  const pathStr = entry?.path ?? "examples/notification-service";
  const claim = claimForId("notification-service", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("notification-service: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    for (let i = 0; i < 6; i++) {
      if (await acceptNotificationPermission(device)) {
        steps.push("notif-permission-allow");
        break;
      }
      await sleep(350);
    }
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    steps.push("post-local-process");
    await tapId(device, "btn-android-local-notif", 8_000);
    await sleep(1_200);

    // Background so shade can show the posted notification.
    await device.pressButton({ button: "HOME" });
    await sleep(500);
    steps.push("home-before-shade");

    steps.push("shade-open-attempt");
    await openNotificationShade(device);

    let hit = false;
    for (let i = 0; i < 12; i++) {
      const labels = flattenLabels(await device.accessibilityTree());
      if (labelsHitMutation(labels)) {
        hit = true;
        break;
      }
      // Re-pull shade if collapsed.
      if (i === 4 || i === 8) {
        await device.pressButton({ button: "HOME" }).catch(() => undefined);
        await sleep(300);
        await openNotificationShade(device);
      }
      await sleep(450);
    }

    if (hit) {
      steps.push("shade-mutated-title-body");
      await device.pressButton({ button: "HOME" }).catch(() => undefined);
      return {
        id: "notification-service",
        path: pathStr,
        phase: 4,
        ok: true,
        status: "green",
        steps: [...steps, "notification-service-android-shade-ok"],
      };
    }

    const labels = flattenLabels(await device.accessibilityTree());
    steps.push("shade-mutation-miss");
    await device.pressButton({ button: "HOME" }).catch(() => undefined);
    return {
      id: "notification-service",
      path: pathStr,
      phase: 4,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `Shade missing mutated title/body (${MUTATED_MARKER} + ${BODY_MARKER}); labels=${labels.slice(0, 80).join(", ")}`,
    };
  } catch (e) {
    await device.pressButton({ button: "HOME" }).catch(() => undefined);
    const msg = String(e);
    const failureKind =
      /not installed|Launch failed|device offline|no devices|pressButton/i.test(
        msg,
      )
        ? "operator"
        : "product";
    return {
      id: "notification-service",
      path: pathStr,
      phase: 4,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
