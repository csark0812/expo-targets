/**
 * Notification Service Extension deep journey.
 *
 * Apple capability: `com.apple.usernotifications.service` appex with a real
 * `UNNotificationServiceExtension` that mutates titles (` [expo-targets]`).
 *
 * GREEN = lock-screen AX + App Group (both), each matching this run’s title
 * nonce + `[expo-targets]`. Phase 1 full-demo bar — dual-AND; App Group alone
 * is not green. Lock-screen AX miss → red even if App Group hits.
 *
 * `device.pushNotification` / simctl push never launches NSE (Apple 55822721).
 * Remote Sandbox push via Devicewright `pushRemoteNotification` (needs APNS_*).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ios, type DeviceSession } from "@csark0812/devicewright";
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
import { runAndroidNotificationServiceJourney } from "./notification-service.android";
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

function extractDevicePushToken(labels: string[]): string | null {
  for (const label of labels) {
    const hex = label.replace(/\s+/g, "");
    if (/^[0-9a-fA-F]{64,}$/.test(hex)) return hex;
  }
  return null;
}

async function waitForDevicePushToken(
  device: DeviceSession,
  timeoutMs = 30_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const labels = flattenLabels(await device.accessibilityTree());
    const err = labels.find((l) => /^error:/i.test(l));
    if (err) {
      throw new Error(`host device push token failed: ${err}`);
    }
    const token = extractDevicePushToken(labels);
    if (token) return token;
    await sleep(500);
  }
  throw new Error(
    "host never exposed an APNs device token (aps-environment / Push capability?)",
  );
}

function titleNonce(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
}

function matchesNonceAndMarker(text: string, nonce: string): boolean {
  return text.includes(nonce) && text.includes(MUTATED_MARKER);
}

export async function runNotificationServiceJourney(
  device: DeviceSession,
  id: "notification-service" = "notification-service",
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidNotificationServiceJourney(device);
  }

  const entry = TARGET_CATALOG[id];
  const pathStr = entry?.path ?? `examples/${id}`;
  const steps: string[] = [];

  try {
    if (!entry) throw new Error(`notification journey: unknown id ${id}`);

    let creds: ReturnType<typeof ios.readApnsCredentialsFromEnv>;
    try {
      creds = ios.readApnsCredentialsFromEnv();
    } catch (e) {
      return {
        id,
        path: pathStr,
        phase: 4,
        ok: false,
        status: "operator",
        steps: ["apns-credentials-unreadable"],
        failureKind: "operator",
        error:
          e instanceof Error
            ? e.message
            : "APNS AuthKey unreadable — set APNS_AUTH_KEY_PATH",
      };
    }
    if (!creds) {
      return {
        id,
        path: pathStr,
        phase: 4,
        ok: false,
        status: "operator",
        steps: ["apns-credentials-missing"],
        failureKind: "operator",
        error:
          "NSE green requires APNs Sandbox remote push. Set APNS_AUTH_KEY_PATH, APNS_KEY_ID, APNS_TEAM_ID (simctl/local push never launches NSE).",
      };
    }
    steps.push("apns-credentials-present");

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

    const deviceToken = await waitForDevicePushToken(device);
    steps.push(`device-push-token:${deviceToken.slice(0, 8)}…`);

    // Clear prior mutation marker if present.
    const group = spawnSync(
      "xcrun",
      [
        "simctl",
        "get_app_container",
        device.deviceId,
        entry.hostBundleId,
        APP_GROUP,
      ],
      { encoding: "utf8", env: process.env },
    );
    if (group.status === 0) {
      const marker = path.join(
        (group.stdout ?? "").trim(),
        "nse-last-title.txt",
      );
      try {
        fs.unlinkSync(marker);
      } catch {
        /* ignore */
      }
    }
    steps.push("appgroup-marker-cleared");

    const nonce = titleNonce();
    const title = `ET NSE ${nonce}`;
    steps.push(`title-nonce:${nonce}`);

    await device.pressButton({ button: "LOCK" });
    await sleep(1_800);
    steps.push("lock-before-push");

    const send = await device.pushRemoteNotification({
      deviceToken,
      bundleId: entry.hostBundleId,
      credentials: creds,
      payload: {
        aps: {
          alert: {
            title,
            body: "pre-mutation body",
          },
          "mutable-content": 1,
          sound: "default",
        },
      },
    });
    steps.push(`apns-remote-send:${send.status}`);
    if (send.status !== 200) {
      // Credentials were present — HTTP reject is product/red, not operator.
      return {
        id,
        path: pathStr,
        phase: 4,
        ok: false,
        status: "red",
        steps,
        failureKind: "product",
        error: `APNs rejected push status=${send.status} body=${send.body}`,
      };
    }

    await tapLabelInTree(device, ["Show Notifications"], { exactOnly: true });
    await sleep(800);
    steps.push("show-notifications");

    let lockHit = false;
    for (let i = 0; i < 16; i++) {
      const labels = flattenLabels(await device.accessibilityTree());
      if (labels.some((l) => matchesNonceAndMarker(l, nonce))) {
        lockHit = true;
        break;
      }
      await sleep(500);
    }
    if (!lockHit) {
      try {
        await device.pressButton({ button: "HOME" });
      } catch {
        /* ignore */
      }
      return {
        id,
        path: pathStr,
        phase: 4,
        ok: false,
        status: "red",
        steps: [...steps, "nse-mutated-title-lockscreen-miss"],
        failureKind: "product",
        error: `Lock-screen AX missing mutated title nonce=${nonce} + ${MUTATED_MARKER} (App Group alone is not green)`,
      };
    }
    steps.push("nse-mutated-title-lockscreen");

    let appGroupTitle: string | null = null;
    for (let i = 0; i < 20; i++) {
      appGroupTitle = readNseMutationFile(device.deviceId, entry.hostBundleId);
      if (appGroupTitle && matchesNonceAndMarker(appGroupTitle, nonce)) break;
      await sleep(500);
    }
    if (!appGroupTitle || !matchesNonceAndMarker(appGroupTitle, nonce)) {
      try {
        await device.pressButton({ button: "HOME" });
      } catch {
        /* ignore */
      }
      return {
        id,
        path: pathStr,
        phase: 4,
        ok: false,
        status: "red",
        steps: [...steps, "nse-mutated-title-appgroup-miss"],
        failureKind: "product",
        error: `App Group nse-last-title missing nonce=${nonce} + ${MUTATED_MARKER} (lock AX alone is not green)`,
      };
    }
    steps.push("nse-mutated-title-appgroup");

    // Optional glance hold so operators can see the mutated lock title.
    await sleep(1_500);
    try {
      await device.pressButton({ button: "HOME" });
    } catch {
      /* ignore */
    }
    steps.push("home-after-demo");

    return {
      id,
      path: pathStr,
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
    const failureKind =
      /not installed|Unable to find|Launch failed|APNS_|credentials|AuthKey|unreadable/i.test(
        msg,
      )
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
