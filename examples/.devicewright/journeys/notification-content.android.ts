/**
 * Android dual of notification-content / native-notification-content.
 * Own posting via host `btn-android-rich-notif` (no notification-service).
 * Locked P: expand notification → RemoteViews / ET NCE Content marker.
 * MUST-GREEN — miss → red only (no os-limit).
 * DeviceSession only.
 */
import type { DeviceSession } from "@csark0812/devicewright";
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
  tapProbeHit,
  waitForId,
  waitForNamed,
} from "./helpers";

/** Prefer RemoteViews custom marker; avoid bare "ET NCE" (host/app label). */
const NCE_MARKERS = ["ET NCE Content"] as const;
const ANDROID_NCE_IDS = new Set([
  "notification-content",
  "native-notification-content",
]);

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
  await sleep(900);
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
      /rich-|RemoteViews|ET NCE|notificationcontent|ET NCE N/i.test(t) &&
      n.frame &&
      n.frame.width > 40 &&
      n.frame.height > 24
    );
  });
  if (!cell?.frame) return null;
  const f = cell.frame;
  return { x: f.x, y: f.y, w: f.width, h: f.height };
}

async function expandNotificationRow(
  device: DeviceSession,
  row: { x: number; y: number; w: number; h: number },
): Promise<void> {
  const cx = Math.round(row.x + row.w / 2);
  const cy = Math.round(row.y + row.h / 2);
  // Long-press then swipe-down expand (OEM shade chrome varies).
  await device.tap({ x: cx, y: cy, duration: 1.2 });
  await sleep(700);
  await device.swipe({
    xStart: cx,
    yStart: cy,
    xEnd: cx,
    yEnd: Math.min(cy + 280, 1800),
    duration: 0.55,
  });
  await sleep(1_000);
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

    // Own posting — must not depend on notification-service.
    steps.push("post-rich-content");
    await tapId(device, "btn-android-rich-notif", 8_000);
    await sleep(1_200);

    await device.pressButton({ button: "HOME" });
    await sleep(500);
    steps.push("home-before-shade");

    steps.push("shade-open");
    await openNotificationShade(device);

    let marker = await waitForNceMarker(device, 4_000);
    if (!marker) {
      const row = await findNotifRow(device);
      if (!row) {
        // Re-open shade once more before failing.
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
      // Still attempt expand for Locked P deepen when marker already visible.
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
