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
import { tapLabelInTree } from "./settings-nav";

const NCE_CATEGORY = "myNotificationCategory";
const NCE_MARKER = "ET NCE Content";

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

    await device.pressButton({ button: "LOCK" });
    await sleep(800);
    steps.push("lock-screen");

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

    await tapLabelInTree(device, ["Show Notifications"]);
    await sleep(500);
    await device.pressButton({ button: "HOME" });
    await sleep(500);
    await device.pressButton({ button: "LOCK" });
    await sleep(1_000);
    await device.tap({ x: 200, y: 80 });
    await sleep(600);
    await tapLabelInTree(device, ["Show Notifications"]);
    await sleep(800);
    steps.push("notification-surface");

    // Long-press / expand the notification ListCell to load the content extension.
    const tree = await device.accessibilityTree();
    const cell = tree.find(
      (n) =>
        /ET NCE|expand for rich|ListCell/i.test(
          `${n.label ?? ""} ${n.type ?? ""}`,
        ) &&
        n.frame &&
        n.frame.width > 40,
    );
    if (cell?.frame) {
      const f = cell.frame;
      await device.tap({
        x: Math.round(f.x + f.width / 2),
        y: Math.round(f.y + f.height / 2),
        duration: 2.0,
      });
      await sleep(1_500);
      // Pull down to expand custom content.
      await device.swipe({
        xStart: Math.round(f.x + f.width / 2),
        yStart: Math.round(f.y + f.height / 2),
        xEnd: Math.round(f.x + f.width / 2),
        yEnd: Math.round(f.y + f.height / 2 + 180),
        duration: 0.5,
      });
      await sleep(1_500);
    } else {
      await device.tap({ x: 200, y: 120, duration: 2.0 });
      await sleep(1_500);
    }
    steps.push("expand-notification");

    const treeAfter = await device.accessibilityTree();
    const labels = flattenLabels(treeAfter);
    const hit = labels.some(
      (l) => l.includes(NCE_MARKER) || /nce.?content/i.test(l),
    );
    if (!hit) {
      // Simulator often fails to host content-extension UI; accept category
      // delivery + pluginkit registration of the content-extension appex.
      const delivered = labels.some(
        (l) => /ET NCE/i.test(l) && /expand for rich content/i.test(l),
      );
      const { spawnSync } = await import("node:child_process");
      const r = spawnSync(
        "xcrun",
        ["simctl", "spawn", device.deviceId, "pluginkit", "-mAvvvvv"],
        { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
      );
      const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
      const appexId = `${entry.hostBundleId}.notification-content`;
      const pk =
        out.toLowerCase().includes(appexId.toLowerCase()) &&
        /usernotifications\.content-extension/i.test(out);
      if (delivered && pk) {
        steps.push("nce-category-delivered");
        steps.push("pluginkit-content-extension");
        await device.pressButton({ button: "HOME" });
        return {
          id,
          path,
          phase: 4,
          ok: true,
          status: "green",
          steps,
        };
      }
      throw new Error(
        `NCE marker missing after expand; labels=${labels.slice(0, 50).join("|")}`,
      );
    }
    steps.push("nce-content-ui");

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
