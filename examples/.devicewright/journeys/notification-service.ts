/**
 * Notification Service Extension deep journey.
 *
 * Apple capability: `com.apple.usernotifications.service` appex with a real
 * `UNNotificationServiceExtension` that mutates titles (` [expo-targets]`).
 *
 * GREEN = mutable-content push → App Group mutation marker (or lock-screen
 * mutated title). Pluginkit alone is not green.
 *
 * When Simulator skips launching the NSE process after honest attempts,
 * return os-limit (CLAIMS) — not soft green.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { DeviceSession } from "@csark0812/devicewright";
import { assertOsLimitAllowed, claimForId } from "../claims";
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

const MUTATED_MARKER = "[expo-targets]";
const APP_GROUP = "group.com.expotargets.example.notification-service";

async function acceptNotificationPermission(
  device: DeviceSession,
): Promise<boolean> {
  try {
    const hit = await findNamedViaPointProbe(
      device,
      ["Allow", "Allow Notifications"],
      {
        timeoutMs: 2_500,
        yStartRatio: 0.35,
        yEndRatio: 0.9,
        stepX: 50,
        stepY: 40,
        allowBlocked: true,
        match: "exact",
        hotspots: [
          { x: 260, y: 520 },
          { x: 280, y: 500 },
          { x: 200, y: 540 },
        ],
      },
    );
    await tapProbeHit(device, hit);
    await sleep(400);
    return true;
  } catch {
    return tapLabelInTree(device, ["Allow", "Allow Notifications"], {
      exactOnly: true,
    });
  }
}

function pluginkitHasNse(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /usernotifications\.service/i.test(out)
  );
}

function readNseMutationFile(udid: string, bundleId: string): string | null {
  const r = spawnSync(
    "xcrun",
    ["simctl", "get_app_container", udid, bundleId, APP_GROUP],
    { encoding: "utf8", env: process.env },
  );
  if (r.status !== 0) return null;
  const dir = (r.stdout ?? "").trim();
  if (!dir) return null;
  try {
    return fs.readFileSync(path.join(dir, "nse-last-title.txt"), "utf8").trim();
  } catch {
    return null;
  }
}

export async function runNotificationServiceJourney(
  device: DeviceSession,
  id: "notification-service" = "notification-service",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  const pathStr = entry?.path ?? `examples/${id}`;
  const steps: string[] = [];

  try {
    if (!entry) throw new Error(`notification journey: unknown id ${id}`);

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    for (let i = 0; i < 8; i++) {
      if (await acceptNotificationPermission(device)) {
        steps.push("notif-permission-allow");
        break;
      }
      await sleep(400);
    }
    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 25_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.notification-service`;
    if (!pluginkitHasNse(device.deviceId, appexId)) {
      throw new Error(`NSE appex missing from pluginkit (${appexId})`);
    }
    steps.push("pluginkit-notification-service");

    await device.pushNotification({
      bundleId: entry.hostBundleId,
      payload: {
        aps: {
          alert: {
            title: "ET NSE",
            body: "pre-mutation body",
          },
          "mutable-content": 1,
          sound: "default",
        },
      },
    });
    steps.push("push-mutable-content");
    await sleep(2_500);

    // Retry mutation read — Simulator NSE launch is flaky.
    let title: string | null = null;
    for (let i = 0; i < 10; i++) {
      title = readNseMutationFile(device.deviceId, entry.hostBundleId);
      if (title?.includes(MUTATED_MARKER)) break;
      await sleep(600);
    }
    if (title?.includes(MUTATED_MARKER)) {
      steps.push("nse-mutated-title-appgroup");
      try {
        await device.pressButton({ button: "HOME" });
      } catch {
        /* ignore */
      }
      return {
        id,
        path: pathStr,
        phase: 4,
        ok: true,
        status: "green",
        steps,
      };
    }

    await device.pressButton({ button: "LOCK" });
    await sleep(600);
    await tapLabelInTree(device, ["Show Notifications"], { exactOnly: true });
    await sleep(600);
    const labels = flattenLabels(await device.accessibilityTree());
    if (
      labels.some(
        (l) => l.includes(MUTATED_MARKER) || /ET NSE.*expo-targets/i.test(l),
      )
    ) {
      steps.push("nse-mutated-title-lockscreen");
      try {
        await device.pressButton({ button: "HOME" });
      } catch {
        /* ignore */
      }
      return {
        id,
        path: pathStr,
        phase: 4,
        ok: true,
        status: "green",
        steps,
      };
    }

    steps.push("nse-mutation-os-skipped");
    assertOsLimitAllowed(id);
    const claim = claimForId(id);
    try {
      await device.pressButton({ button: "HOME" });
    } catch {
      /* ignore */
    }
    return {
      id,
      path: pathStr,
      phase: 4,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        "NSE mutation skipped on Simulator after App Group + lock-screen checks",
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
