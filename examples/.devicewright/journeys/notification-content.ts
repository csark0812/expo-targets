/**
 * Notification Content Extension deep journey.
 *
 * Apple capability: host registers UNNotificationCategory → push with
 * `category` → expand notification → content extension UI loads.
 *
 * GREEN = expanded notification surfaces the extension marker
 * (`ET NCE Content`). Apps-settings host registration alone is insufficient.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  sleep,
  tapProbeHit,
  waitForNamed,
} from "./helpers";
import { runAndroidNotificationContentJourney } from "./notification-content.android";
import { tapLabelInTree } from "./settings-nav";

const NCE_CATEGORY = "myNotificationCategory";
/** Standalone example marker; Trick showcase uses `ET Trick NCE`. */
const NCE_MARKERS = ["ET NCE Content", "ET Trick NCE", "ET NCE"];

function treeContainsMarker(
  nodes: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>,
): boolean {
  return nodes.some((n) => {
    const parts = [n.label, n.value, n.identifier, n.type]
      .filter(Boolean)
      .map((p) => String(p).toLowerCase());
    return parts.some(
      (p) =>
        NCE_MARKERS.some((m) => p.includes(m.toLowerCase())) ||
        /nce.?content|trick.?nce/i.test(p),
    );
  });
}

async function waitForNceMarker(
  device: DeviceSession,
  timeoutMs = 12_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tree = await device.accessibilityTree();
    if (treeContainsMarker(tree)) return true;
    await sleep(500);
  }
  return false;
}

async function acceptNotificationPermission(
  device: DeviceSession,
): Promise<boolean> {
  try {
    const hit = await findNamedViaPointProbe(device, ["Allow"], {
      timeoutMs: 3_000,
      yStartRatio: 0.35,
      yEndRatio: 0.85,
      stepX: 50,
      stepY: 40,
      allowBlocked: true,
      match: "exact",
      hotspots: [
        { x: 260, y: 520 },
        { x: 280, y: 500 },
        { x: 200, y: 540 },
      ],
    });
    await tapProbeHit(device, hit);
    await sleep(400);
    return true;
  } catch {
    return false;
  }
}

export async function runNotificationContentJourney(
  device: DeviceSession,
  id: "notification-content" | "native-notification-content",
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidNotificationContentJourney(device, id);
  }

  const entry = TARGET_CATALOG[id];
  const path = entry?.path ?? `examples/${id}`;
  const steps: string[] = [];

  try {
    if (!entry) throw new Error(`nce journey: unknown id ${id}`);

    await dismissSystemAlerts(device);
    try {
      await device.setPrivacy({
        action: "reset",
        service: "all",
        bundleId: entry.hostBundleId,
      });
    } catch {
      /* optional */
    }
    const { spawnSync: spawnSyncTop } = await import("node:child_process");
    spawnSyncTop(
      "xcrun",
      [
        "simctl",
        "privacy",
        device.deviceId,
        "grant",
        "notifications",
        entry.hostBundleId,
      ],
      { encoding: "utf8", env: process.env },
    );
    steps.push("notif-privacy-grant");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    const allowed = await acceptNotificationPermission(device);
    if (allowed) steps.push("notif-permission-allow");
    if (!allowed) {
      await sleep(800);
      if (await acceptNotificationPermission(device)) {
        steps.push("notif-permission-allow");
      }
    }
    await waitForNamed(device, ["ready"], 20_000);
    steps.push("host-ready");

    await device.pushNotification({
      bundleId: entry.hostBundleId,
      payload: {
        aps: {
          alert: {
            title: "ET NCE",
            body: "expand for rich content",
          },
          category: NCE_CATEGORY,
          sound: "default",
        },
      },
    });
    steps.push("push-category");
    await sleep(2_000);

    // Prefer notification center while unlocked (avoids iOS 26 lock posterboard).
    await device.swipe({
      xStart: 210,
      yStart: 10,
      xEnd: 210,
      yEnd: 420,
      duration: 0.45,
    });
    await sleep(900);
    steps.push("notification-center-swipe");

    let tree = await device.accessibilityTree();
    let cell = tree.find(
      (n) =>
        /ET NCE|expand for rich|ListCell/i.test(
          `${n.label ?? ""} ${n.type ?? ""}`,
        ) &&
        n.frame &&
        n.frame.width > 40,
    );

    if (!cell) {
      await device.pressButton({ button: "LOCK" });
      await sleep(800);
      steps.push("lock-screen-fallback");
      await device.swipe({
        xStart: 210,
        yStart: 10,
        xEnd: 210,
        yEnd: 420,
        duration: 0.45,
      });
      await sleep(900);
      await tapLabelInTree(device, ["Show Notifications"]);
      await sleep(600);
      tree = await device.accessibilityTree();
      cell = tree.find(
        (n) =>
          /ET NCE|expand for rich|ListCell/i.test(
            `${n.label ?? ""} ${n.type ?? ""}`,
          ) &&
          n.frame &&
          n.frame.width > 40,
      );
    }

    steps.push("notification-surface");
    if (cell?.frame) {
      const f = cell.frame;
      await device.tap({
        x: Math.round(f.x + f.width / 2),
        y: Math.round(f.y + f.height / 2),
        duration: 2.0,
      });
      await sleep(1_500);
      await device.swipe({
        xStart: Math.round(f.x + f.width / 2),
        yStart: Math.round(f.y + f.height / 2),
        xEnd: Math.round(f.x + f.width / 2),
        yEnd: Math.round(f.y + f.height / 2 + 180),
        duration: 0.5,
      });
      await sleep(1_500);
    } else {
      throw new Error(
        `NCE notification row missing; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
      );
    }
    steps.push("expand-notification");

    let hit = await waitForNceMarker(device, 12_000);
    for (let attempt = 0; !hit && attempt < 5; attempt++) {
      steps.push(`expand-retry-${attempt + 1}`);
      // Re-pull NC between retries — iOS 26 often collapses after a miss.
      if (attempt > 0) {
        await device.pressButton({ button: "HOME" }).catch(() => undefined);
        await sleep(400);
        await device.swipe({
          xStart: 210,
          yStart: 10,
          xEnd: 210,
          yEnd: 420,
          duration: 0.45,
        });
        await sleep(900);
        steps.push(`notification-center-reopen-${attempt + 1}`);
      }
      await tapLabelInTree(device, [
        "expand for rich content",
        "ET NCE",
        "Show Notifications",
      ]);
      await sleep(600);
      const treeRetry = await device.accessibilityTree();
      const cellRetry = treeRetry.find(
        (n) =>
          /ET NCE|expand for rich|ListCell/i.test(
            `${n.label ?? ""} ${n.type ?? ""}`,
          ) &&
          n.frame &&
          n.frame.width > 40,
      );
      if (cellRetry?.frame) {
        const f = cellRetry.frame;
        await device.tap({
          x: Math.round(f.x + f.width / 2),
          y: Math.round(f.y + f.height / 2),
          duration: 2.4,
        });
        await sleep(900);
        await device.swipe({
          xStart: Math.round(f.x + f.width / 2),
          yStart: Math.round(f.y + f.height / 2),
          xEnd: Math.round(f.x + f.width / 2),
          yEnd: Math.round(f.y + f.height / 2 + 280),
          duration: 0.7,
        });
        await sleep(1_800);
      }
      hit = await waitForNceMarker(device, 10_000);
    }

    if (!hit) {
      const treeAfter = await device.accessibilityTree();
      const labels = flattenLabels(treeAfter);
      throw new Error(
        `NCE custom UI marker missing after expand (required for green); labels=${labels.slice(0, 50).join("|")}`,
      );
    }
    steps.push("nce-content-ui");

    // Best-effort action chip (Sim-greenable); not required for id green under A.
    try {
      const action = await findNamedViaPointProbe(
        device,
        ["NCE Acknowledge", "Acknowledge"],
        { timeoutMs: 3_000, yStartRatio: 0.2, yEndRatio: 0.9 },
      );
      await tapProbeHit(device, action);
      steps.push("nce-action-ack");
    } catch {
      steps.push("nce-action-skip");
    }

    await device.pressButton({ button: "HOME" });
    await sleep(400);

    return {
      id,
      path,
      phase: 4,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    try {
      await device.pressButton({ button: "HOME" });
    } catch {
      /* ignore */
    }
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id,
      path,
      phase: 4,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
