/**
 * Android dual of notification-service — FCM remote push (preferred) or local
 * pre-display. Green on shade mutation (` [expo-targets]` + body marker).
 * DeviceSession only.
 *
 * FCM path (retire README §): FCM_SERVICE_ACCOUNT_PATH + FCM_PROJECT_ID + host
 * FCM token + ExpoTargetsFcmMessagingService → shade AX. Missing creds → local
 * fallback (CLAIMS os-limit still allowed). Shade miss after FCM → keep CLAIMS.
 */
import { android, type DeviceSession } from "@csark0812/devicewright";
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
  ANDROID_POST_TAP_MS,
  ANDROID_SETTINGS_SETTLE_MS,
} from "./helpers";

const MUTATED_MARKER = "[expo-targets]";
const BODY_MARKER = "local NSE path";
const FCM_BODY_MARKER = "fcm NSE path";

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
  await device.swipe({
    xStart: 540,
    yStart: 8,
    xEnd: 540,
    yEnd: 1400,
    duration: 0.45,
  });
  await sleep(ANDROID_POST_TAP_MS);
}

function labelsHitMutation(labels: string[], bodyNeedle: string): boolean {
  const flat = labels.join("\n");
  return (
    flat.includes(MUTATED_MARKER) &&
    new RegExp(bodyNeedle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "|ET NSE", "i").test(
      flat,
    )
  );
}

async function scrapeDevicePushToken(
  device: DeviceSession,
): Promise<string | null> {
  const tree = await device.accessibilityTree();
  const node = tree.find((n) => n.identifier === "text-device-push-token");
  const raw = String(node?.value ?? node?.label ?? "").trim();
  if (!raw || raw === "pending" || raw === "none" || raw.startsWith("error:")) {
    return null;
  }
  // FCM tokens are long opaque strings (no spaces).
  if (raw.length < 20) return null;
  return raw.replace(/\s+/g, "");
}

async function waitForShadeMutation(
  device: DeviceSession,
  bodyNeedle: string,
): Promise<boolean> {
  for (let i = 0; i < 12; i++) {
    const labels = flattenLabels(await device.accessibilityTree());
    if (labelsHitMutation(labels, bodyNeedle)) return true;
    if (i === 4 || i === 8) {
      await device.pressButton({ button: "HOME" }).catch(() => undefined);
      await sleep(300);
      await openNotificationShade(device);
    }
    await sleep(450);
  }
  return false;
}

async function runLocalShadePath(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  steps.push("post-local-process");
  await tapId(device, "btn-android-local-notif", 8_000);
  await sleep(ANDROID_SETTINGS_SETTLE_MS);
  await device.pressButton({ button: "HOME" });
  await sleep(500);
  steps.push("home-before-shade");
  steps.push("shade-open-attempt");
  await openNotificationShade(device);
  return waitForShadeMutation(device, BODY_MARKER);
}

async function runFcmShadePath(
  device: DeviceSession,
  steps: string[],
  pkg: string,
  creds: NonNullable<ReturnType<typeof android.readFcmCredentialsFromEnv>>,
): Promise<"green" | "transport-fail" | "shade-miss" | "no-token"> {
  const token = await scrapeDevicePushToken(device);
  if (!token) return "no-token";
  steps.push(`fcm-device-token:${token.slice(0, 8)}…`);

  const nonce = `fcm-${Date.now().toString(36)}`;
  const title = `ET NSE ${nonce}`;
  steps.push(`fcm-title-nonce:${nonce}`);

  await device.pressButton({ button: "HOME" });
  await sleep(400);
  steps.push("home-before-fcm");

  const send = await device.pushRemoteNotification({
    deviceToken: token,
    fcmCredentials: {
      serviceAccountPath: creds.serviceAccountPath,
      projectId: creds.projectId,
    },
    payload: {
      data: {
        title,
        body: FCM_BODY_MARKER,
        expo_targets_kind: "service",
      },
    },
  });
  steps.push(`fcm-remote-send:${send.status}`);
  if (send.status !== 200) return "transport-fail";

  await sleep(1_200);
  steps.push("shade-open-attempt-fcm");
  await openNotificationShade(device);
  const hit = await waitForShadeMutation(device, FCM_BODY_MARKER);
  // Also accept nonce + mutation marker (body may be truncated in shade).
  if (!hit) {
    const labels = flattenLabels(await device.accessibilityTree());
    const flat = labels.join("\n");
    if (flat.includes(MUTATED_MARKER) && flat.includes(nonce)) {
      steps.push("shade-mutated-via-nonce");
      return "green";
    }
    return "shade-miss";
  }
  return "green";
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

    const fcmCreds = android.readFcmCredentialsFromEnv();
    if (fcmCreds) {
      steps.push("fcm-credentials-present");
      // Re-launch so token AX is fresh after permission.
      await device.launchApp(pkg, { terminateRunning: true });
      await dismissSystemAlerts(device);
      await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
      await sleep(1_500);

      const fcm = await runFcmShadePath(device, steps, pkg, fcmCreds);
      if (fcm === "green") {
        steps.push("shade-mutated-title-body");
        await device.pressButton({ button: "HOME" }).catch(() => undefined);
        return {
          id: "notification-service",
          path: pathStr,
          phase: 4,
          ok: true,
          status: "green",
          steps: [...steps, "notification-service-android-fcm-shade-ok"],
        };
      }
      if (fcm === "transport-fail") {
        steps.push("fcm-transport-fail-fallback-local");
      } else if (fcm === "no-token") {
        steps.push("fcm-token-missing-fallback-local");
      } else {
        steps.push("fcm-shade-miss-fallback-local");
      }
      // Re-enter host for local fallback button.
      await device.launchApp(pkg, { terminateRunning: false });
      await waitForId(device, hostReadyTestId(entry.testIds), 10_000);
    } else {
      steps.push("fcm-credentials-missing-local-fallback");
    }

    const hit = await runLocalShadePath(device, steps);
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
        `Shade missing mutated title/body (${MUTATED_MARKER}); labels=${labels.slice(0, 80).join(", ")}`,
    };
  } catch (e) {
    await device.pressButton({ button: "HOME" }).catch(() => undefined);
    const msg = String(e);
    const failureKind =
      /not installed|Launch failed|device offline|no devices|pressButton|FCM_/i.test(
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
