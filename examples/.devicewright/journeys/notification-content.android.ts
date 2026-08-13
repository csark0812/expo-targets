/**
 * Android dual of notification-content / native-notification-content.
 * Own posting via host `btn-android-rich-notif` (no notification-service).
 * Locked P: expand notification → RemoteViews / ET NCE Content marker.
 * MUST-GREEN — miss → red only (no os-limit).
 *
 * When FCM_* creds are present (RN host only), also try remote data push via
 * ExpoTargetsFcmMessagingService before the local button path.
 * DeviceSession only.
 */
import { android, type DeviceSession } from "@csark0812/devicewright";
import { hostLaunchId, TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  hostReadyTestId,
  nodeVisibleText,
  sleep,
  tapCenter,
  tapId,
  tapNamedAndroid,
  tapProbeHit,
  waitForId,
  waitForNamed,
  ANDROID_POST_TAP_MS,
  ANDROID_SETTINGS_SETTLE_MS,
} from "./helpers";

/** Prefer RemoteViews custom marker; avoid bare "ET NCE" (host/app label). */
const NCE_MARKERS = ["ET NCE Content"] as const;
const ANDROID_NCE_IDS = new Set([
  "notification-content",
  "native-notification-content",
]);
const FCM_BODY_MARKER = "fcm NCE path";

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

function treeHasNceMarker(
  nodes: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>,
): boolean {
  return nodes.some((n) => {
    const parts = [
      nodeVisibleText(n),
      n.label,
      n.value,
      n.identifier,
      n.type,
    ]
      .filter(Boolean)
      .map((p) => String(p).toLowerCase());
    return parts.some(
      (p) =>
        NCE_MARKERS.some((m) => p.includes(m.toLowerCase())) ||
        /et nce content/i.test(p),
    );
  });
}

async function waitForNceMarker(
  device: DeviceSession,
  timeoutMs = 8_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (treeHasNceMarker(await device.accessibilityTree())) return true;
    await sleep(400);
  }
  return false;
}

async function findNotifRow(
  device: DeviceSession,
): Promise<{ x: number; y: number; w: number; h: number } | null> {
  const tree = await device.accessibilityTree();
  const cell = tree.find((n) => {
    const t = `${nodeVisibleText(n)} ${n.label ?? ""} ${n.type ?? ""}`;
    return (
      /rich-|RemoteViews|ET NCE Content|ET NCE|notificationcontent|ET NCE N|myNotificationCategory|fcm NCE/i.test(
        t,
      ) &&
      n.frame &&
      n.frame.width > 40 &&
      n.frame.height > 24
    );
  });
  if (!cell?.frame) return null;
  return {
    x: cell.frame.x,
    y: cell.frame.y,
    w: cell.frame.width,
    h: cell.frame.height,
  };
}

async function expandNotificationRow(
  device: DeviceSession,
  row: { x: number; y: number; w: number; h: number },
): Promise<void> {
  const cx = row.x + row.w / 2;
  const cy = row.y + row.h / 2;
  await device.swipe({
    xStart: cx,
    yStart: cy,
    xEnd: cx,
    yEnd: Math.min(cy + 280, 1800),
    duration: 0.55,
  });
  await sleep(450);
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
  if (raw.length < 20) return null;
  return raw.replace(/\s+/g, "");
}

async function tryFcmNcePath(
  device: DeviceSession,
  steps: string[],
  creds: NonNullable<ReturnType<typeof android.readFcmCredentialsFromEnv>>,
): Promise<boolean> {
  const token = await scrapeDevicePushToken(device);
  if (!token) {
    steps.push("fcm-token-missing");
    return false;
  }
  steps.push(`fcm-device-token:${token.slice(0, 8)}…`);
  const nonce = `rich-fcm-${Date.now().toString(36)}`;
  const send = await device.pushRemoteNotification({
    deviceToken: token,
    fcmCredentials: {
      serviceAccountPath: creds.serviceAccountPath,
      projectId: creds.projectId,
    },
    payload: {
      data: {
        title: nonce,
        body: FCM_BODY_MARKER,
        expo_targets_kind: "content",
        expo_targets_category: "myNotificationCategory",
      },
    },
  });
  steps.push(`fcm-remote-send:${send.status}`);
  if (send.status !== 200) return false;

  await device.pressButton({ button: "HOME" });
  await sleep(800);
  await openNotificationShade(device);
  let marker = await waitForNceMarker(device, 4_000);
  if (!marker) {
    const row = await findNotifRow(device);
    if (row) {
      steps.push("fcm-expand-notification");
      await expandNotificationRow(device, row);
      marker = await waitForNceMarker(device, 8_000);
    }
  }
  return marker;
}

export async function runAndroidNotificationContentJourney(
  device: DeviceSession,
  id: "notification-content" | "native-notification-content",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  if (!entry || !ANDROID_NCE_IDS.has(String(id))) {
    return {
      id: String(id),
      path: entry?.path ?? String(id),
      phase: 4,
      ok: false,
      status: "stub",
      steps: ["android-unsupported"],
      error: `android nce journey not wired for ${String(id)}`,
      failureKind: "stub",
    };
  }

  const pathStr = entry.path;
  const steps: string[] = [];
  const pkg = hostLaunchId(entry, "android");

  try {
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

    // RN host: prefer FCM when operator creds are present (showcase § gate).
    if (id === "notification-content") {
      const fcmCreds = android.readFcmCredentialsFromEnv();
      if (fcmCreds) {
        steps.push("fcm-credentials-present");
        await sleep(1_200);
        if (await tryFcmNcePath(device, steps, fcmCreds)) {
          steps.push("nce-remoteviews-marker-fcm");
          await device.pressButton({ button: "HOME" }).catch(() => undefined);
          return {
            id: entry.id,
            path: pathStr,
            phase: 4,
            ok: true,
            status: "green",
            steps: [...steps, `${id}-android-nce-fcm-ok`],
          };
        }
        steps.push("fcm-nce-miss-fallback-local");
        await device.launchApp(pkg, { terminateRunning: false });
        await waitForId(device, hostReadyTestId(entry.testIds), 10_000);
      } else {
        steps.push("fcm-credentials-missing-local-fallback");
      }
    }

    // Own posting — must not depend on notification-service.
    steps.push("post-rich-content");
    await tapId(device, "btn-android-rich-notif", 8_000);
    await sleep(ANDROID_SETTINGS_SETTLE_MS);
    try {
      const tree = await device.accessibilityTree();
      const payload = tree.find((n) => n.identifier === entry.testIds.lastPayload);
      const text = String(payload?.value ?? payload?.label ?? "");
      if (!/^rich-\d+/i.test(text)) {
        throw new Error(`NCE post did not update host payload; last=${text || "none"}`);
      }
      steps.push("post-rich-payload-ok");
    } catch (e) {
      throw e instanceof Error
        ? e
        : new Error(`NCE post did not update host payload; ${String(e)}`);
    }

    await device.pressButton({ button: "HOME" });
    await sleep(500);
    steps.push("home-before-shade");

    steps.push("shade-open");
    await openNotificationShade(device);
    if (await tapNamedAndroid(device, ["Clear all"], 1_200)) {
      steps.push("shade-cleared");
      await device.pressButton({ button: "HOME" }).catch(() => undefined);
      await sleep(300);
      await device.launchApp(pkg, { terminateRunning: false });
      await waitForId(device, hostReadyTestId(entry.testIds), 10_000);
      await tapId(device, "btn-android-rich-notif", 8_000);
      await sleep(ANDROID_SETTINGS_SETTLE_MS);
      await device.pressButton({ button: "HOME" });
      await sleep(400);
      await openNotificationShade(device);
      steps.push("post-rich-after-clear");
    }

    let marker = await waitForNceMarker(device, 4_000);
    if (!marker) {
      const row = await findNotifRow(device);
      if (!row) {
        await device.pressButton({ button: "HOME" }).catch(() => undefined);
        await sleep(300);
        await openNotificationShade(device);
      }
      const row2 = (await findNotifRow(device)) ?? row;
      if (!row2) {
        const labels = flattenLabels(await device.accessibilityTree());
        throw new Error(
          `NCE notification row missing after own post; labels=${labels.slice(0, 60).join("|")}`,
        );
      }
      steps.push("expand-notification");
      await expandNotificationRow(device, row2);
      marker = await waitForNceMarker(device, 8_000);
    } else {
      steps.push("nce-marker-pre-expand");
      const row = await findNotifRow(device);
      if (row) {
        steps.push("expand-notification");
        await expandNotificationRow(device, row);
        marker = (await waitForNceMarker(device, 4_000)) || marker;
      }
    }

    if (!marker) {
      for (let attempt = 0; attempt < 3 && !marker; attempt++) {
        steps.push(`expand-retry-${attempt + 1}`);
        await device.pressButton({ button: "HOME" }).catch(() => undefined);
        await sleep(350);
        await openNotificationShade(device);
        const row = await findNotifRow(device);
        if (row) await expandNotificationRow(device, row);
        marker = await waitForNceMarker(device, 6_000);
      }
    }

    if (!marker) {
      const labels = flattenLabels(await device.accessibilityTree());
      throw new Error(
        `NCE RemoteViews/custom marker missing after expand (required for green); labels=${labels.slice(0, 60).join("|")}`,
      );
    }
    steps.push("nce-remoteviews-marker");

    await device.pressButton({ button: "HOME" }).catch(() => undefined);
    return {
      id: entry.id,
      path: pathStr,
      phase: 4,
      ok: true,
      status: "green",
      steps: [...steps, `${id}-android-nce-ok`],
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
      id: entry.id,
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
