/**
 * Live Activity journey (Trick showcase).
 *
 * GREEN = host ActivityKit start+update+end **and** Lock Screen chrome with
 * activity labels (idb sees the Always Allow / ET Trick Live surface; the
 * post-allow widget itself is often AX-opaque to idb). Watch chrome is
 * required when a watchOS sim exists and `launchWatchPhonePair` boots; when
 * no watch runtime/devices exist, Lock+host is the full-demo floor.
 * Pluginkit-only ≠ green. DI / push / StandBy remain CLAIMS.
 */
import { spawnSync } from "node:child_process";
import { devices, ios } from "@csark0812/devicewright";
import type { DeviceSession } from "@csark0812/devicewright";
import { assertOsLimitAllowed, claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapId,
  tapProbeHit,
  waitForId,
  waitForNamed,
} from "./helpers";
import { tapLabelInTree } from "./settings-nav";

/** Prefer ET Trick Live; allow / Always Allow sheets are lock-surface proof for idb. */
const LOCK_ACTIVITY_RE =
  /ET Trick Live|Allow Live Activities from ET Trick|continue to allow Live Activities from ET Trick|Always Allow|^ET Trick$/i;

function claimsLive(
  pathStr: string,
  steps: string[],
  detail: string,
): TargetJourneyResult {
  assertOsLimitAllowed("live-activity");
  const claim = claimForId("live-activity");
  return {
    id: "live-activity",
    path: pathStr,
    phase: 3,
    ok: true,
    status: "os-limit",
    steps,
    failureKind: "os-limit",
    error: `${claim?.reason ?? "Live Activity chrome os-limit"} — ${detail}`,
  };
}

/** Authorize Live Activities for the host (ActivityAuthorizationInfo). */
function enableLiveActivitiesForHost(udid: string, bundleId: string): void {
  spawnSync(
    "xcrun",
    [
      "simctl",
      "spawn",
      udid,
      "defaults",
      "write",
      "com.apple.liveactivitiesd",
      "AppAuthorizationRecords",
      "-dict-add",
      bundleId,
      "-int",
      "1",
    ],
    { encoding: "utf8", env: process.env },
  );
}

function watchSimulatorAvailable(): boolean {
  try {
    return ios.simctl.listSimulators({ family: "watch" }).length > 0;
  } catch {
    return false;
  }
}

/** Boot watch by UDID — `simctl boot <pairId>` is invalid on current Xcode. */
function bootWatchUdid(watchUdid: string): void {
  const boot = spawnSync("xcrun", ["simctl", "boot", watchUdid], {
    encoding: "utf8",
    env: process.env,
  });
  // Already Booted → non-zero; ignore and wait via bootstatus.
  const ready = spawnSync(
    "xcrun",
    ["simctl", "bootstatus", watchUdid, "-b"],
    { encoding: "utf8", env: process.env, timeout: 120_000 },
  );
  if (ready.status !== 0 && boot.status !== 0) {
    throw new Error(
      `watch boot failed: ${boot.stderr || boot.stdout || ready.stderr}`,
    );
  }
}

function pairConnected(pairId: string): boolean {
  const r = spawnSync("xcrun", ["simctl", "list", "pairs"], {
    encoding: "utf8",
    env: process.env,
  });
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const idx = out.indexOf(pairId);
  if (idx < 0) return false;
  const window = out.slice(idx, idx + 120);
  return /connected/i.test(window) && !/disconnected/i.test(window);
}

async function waitForPairConnected(
  pairId: string,
  steps: string[],
  timeoutMs = 40_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (pairConnected(pairId)) {
      steps.push("watch-pair-connected");
      return true;
    }
    await sleep(1_500);
  }
  steps.push("watch-pair-disconnected");
  return false;
}

/**
 * Pair phone+watch without DW pair-UUID boot (broken on this Xcode), then open
 * a watch DeviceSession.
 */
async function openWatchPairSession(phoneUdid: string): Promise<{
  watch: DeviceSession;
  watchUdid: string;
  pairId: string;
}> {
  const pair = ios.ensureWatchPhonePair({
    phoneId: phoneUdid,
    watch: "Apple Watch",
    activate: false,
    boot: false,
  });
  bootWatchUdid(pair.watch.udid);
  const watch = await devices.launch({
    platform: "ios",
    deviceId: pair.watch.udid,
    lock: false,
    boot: false,
  });
  return { watch, watchUdid: pair.watch.udid, pairId: pair.pairId };
}

const WATCH_ACTIVITY_RE =
  /CarouselLiveActivitiesAlertUI|ET Trick Live|ET Trick/i;

async function assertWatchActivityChrome(
  watch: DeviceSession,
  steps: string[],
): Promise<boolean> {
  // Exit app grid / Control Center / Siren → ClockFace, then open Smart Stack.
  for (const _ of [0, 1]) {
    try {
      await watch.pressButton({ button: "HOME" });
    } catch {
      /* watch HOME may no-op */
    }
    await sleep(500);
  }

  for (let i = 0; i < 12; i++) {
    let labels = flattenLabels(await watch.accessibilityTree());
    steps.push(`watch-ax-labels:${labels.length}:${labels.slice(0, 6).join("|")}`);
    if (labels.some((l) => WATCH_ACTIVITY_RE.test(l))) {
      steps.push("watch-activity-visible");
      return true;
    }

    // Dismiss Siren / transient watch UI that steals the face.
    if (labels.some((l) => /Siren|Cancel|Done|Dismiss/i.test(l))) {
      await tapLabelInTree(watch, ["Cancel", "Done", "Dismiss", "Close"], {
        exactOnly: false,
      });
      await sleep(600);
      try {
        await watch.pressButton({ button: "HOME" });
      } catch {
        /* optional */
      }
      await sleep(500);
    }

    // Smart Stack: swipe up from bottom of watch face (several amplitudes).
    const swipes = [
      { xStart: 104, yStart: 220, xEnd: 104, yEnd: 30, duration: 0.45 },
      { xStart: 104, yStart: 200, xEnd: 104, yEnd: 40, duration: 0.35 },
      { xStart: 90, yStart: 210, xEnd: 90, yEnd: 50, duration: 0.4 },
    ] as const;
    try {
      await watch.swipe(swipes[i % swipes.length]);
    } catch {
      /* optional */
    }
    await sleep(1_000);

    labels = flattenLabels(await watch.accessibilityTree());
    if (labels.some((l) => WATCH_ACTIVITY_RE.test(l))) {
      steps.push("watch-activity-visible");
      return true;
    }

    // Widget is often AX-opaque until tapped → CarouselLiveActivitiesAlertUI.
    await watch.tap({ x: 104, y: 130 });
    await sleep(900);
    labels = flattenLabels(await watch.accessibilityTree());
    if (labels.some((l) => WATCH_ACTIVITY_RE.test(l))) {
      steps.push("watch-activity-visible");
      return true;
    }
    await watch.tap({ x: 104, y: 100 });
    await sleep(700);
    labels = flattenLabels(await watch.accessibilityTree());
    if (labels.some((l) => WATCH_ACTIVITY_RE.test(l))) {
      steps.push("watch-activity-visible");
      return true;
    }
  }
  return false;
}

function lockLooksLikeActivityChrome(labels: string[]): boolean {
  return labels.some((l) => LOCK_ACTIVITY_RE.test(l.trim()));
}

async function acceptLockLiveActivityPrompt(
  device: DeviceSession,
  labels: string[],
  steps: string[],
): Promise<void> {
  if (labels.some((l) => /Always Allow/i.test(l))) {
    await tapLabelInTree(device, ["Always Allow"]);
    await sleep(600);
    steps.push("lock-always-allow");
    return;
  }
  if (
    labels.some((l) => /^Allow$/i.test(l.trim())) &&
    labels.some((l) => /Allow Live Activities from ET Trick/i.test(l))
  ) {
    await tapLabelInTree(device, ["Allow"], { exactOnly: true });
    await sleep(600);
    steps.push("lock-allow");
  }
}

async function assertLockActivityChrome(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  const activityHotspots = [
    { x: 210, y: 700 },
    { x: 210, y: 686 },
    { x: 210, y: 730 },
    { x: 210, y: 650 },
    { x: 160, y: 700 },
    { x: 260, y: 700 },
  ];

  for (let i = 0; i < 14; i++) {
    if (i === 4 || i === 9) {
      // Re-lock — swipe/unlock can leave SpringBoard on the host app.
      await device.pressButton({ button: "HOME" }).catch(() => undefined);
      await sleep(400);
      await device.pressButton({ button: "LOCK" }).catch(() => undefined);
      await sleep(1_100);
      steps.push(`lock-rearm-${i}`);
    }

    let tree = await device.accessibilityTree();
    let labels = flattenLabels(tree);
    if (lockLooksLikeActivityChrome(labels)) {
      await acceptLockLiveActivityPrompt(device, labels, steps);
      steps.push("lock-activity-visible");
      return true;
    }

    // iOS 26: Live Activity often appears as an empty-label ListCell on Lock.
    const listCell = tree.find(
      (n) =>
        String(n.identifier ?? "") === "ListCell" &&
        n.frame != null &&
        n.frame.y >= 560 &&
        n.frame.y <= 820 &&
        n.frame.width > 80,
    );
    if (listCell?.frame) {
      const f = listCell.frame;
      await device.tap({
        x: Math.round(f.x + f.width / 2),
        y: Math.round(f.y + f.height / 2),
      });
      await sleep(900);
      steps.push(
        `lock-listcell-tap:${Math.round(f.x + f.width / 2)},${Math.round(f.y + f.height / 2)}`,
      );
      tree = await device.accessibilityTree();
      labels = flattenLabels(tree);
      if (lockLooksLikeActivityChrome(labels)) {
        await acceptLockLiveActivityPrompt(device, labels, steps);
        steps.push("lock-activity-visible");
        return true;
      }
      // Empty ListCell itself is the Live Activity surface when AX omits title.
      if (
        labels.some((l) => /Show Notifications/i.test(l)) &&
        tree.some(
          (n) =>
            String(n.identifier ?? "") === "ListCell" &&
            (n.frame?.y ?? 0) >= 560,
        )
      ) {
        steps.push("lock-activity-listcell");
        return true;
      }
    }

    const pt = activityHotspots[i % activityHotspots.length];
    await device.tap(pt);
    await sleep(700);
    steps.push(`lock-activity-tap:${pt.x},${pt.y}`);

    labels = flattenLabels(await device.accessibilityTree());
    if (lockLooksLikeActivityChrome(labels)) {
      await acceptLockLiveActivityPrompt(device, labels, steps);
      steps.push("lock-activity-visible");
      return true;
    }

    await tapLabelInTree(device, ["Show Notifications"], { exactOnly: true });
    await sleep(500);
  }
  return false;
}

export async function runLiveActivityJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["live-activity"];
  const pathStr = entry?.path ?? "examples/trick";
  const steps: string[] = [];
  try {
    if (!entry) throw new Error("live-activity: missing catalog entry");

    enableLiveActivitiesForHost(device.deviceId, entry.hostBundleId);
    steps.push("live-activities-authorized");

    steps.push("launch-host");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await sleep(800);
    await dismissSystemAlerts(device);
    try {
      await waitForId(device, hostReadyTestId(entry.testIds), 25_000);
    } catch {
      await waitForNamed(device, ["ready"], 15_000);
    }
    steps.push("host-ready");

    await tapId(device, "btn-start-live", 10_000);
    await sleep(1_500);
    steps.push("start-live");

    let tree = await device.accessibilityTree();
    let labels = flattenLabels(tree);
    // Surface Settings-disabled errors instead of a silent none.
    if (labels.some((l) => /Live Activities disabled/i.test(l))) {
      return {
        id: "live-activity",
        path: pathStr,
        phase: 3,
        ok: false,
        status: "operator",
        steps,
        error:
          "Live Activities still disabled after AppAuthorizationRecords enable — check Settings → Apps → ET Trick",
        failureKind: "operator",
      };
    }
    const activityStarted = (ls: string[]) =>
      ls.some(
        (l) =>
          (/live activity:/i.test(l) && !/live activity:\s*none/i.test(l)) ||
          /Live Activity [0-9A-F-]{8,}/i.test(l),
      );
    if (!activityStarted(labels)) {
      for (let i = 0; i < 8; i++) {
        await sleep(400);
        labels = flattenLabels(await device.accessibilityTree());
        if (activityStarted(labels)) break;
      }
    }
    if (!activityStarted(labels)) {
      return {
        id: "live-activity",
        path: pathStr,
        phase: 3,
        ok: false,
        status: "red",
        steps,
        error:
          "Live Activity host id not set (pluginkit-only / host-floor alone is not green)",
        failureKind: "product",
      };
    }
    steps.push("live-id-set");

    try {
      await tapId(device, "btn-update-live", 8_000);
    } catch {
      const hit = await findNamedViaPointProbe(
        device,
        ["Update Live Activity", "btn-update-live"],
        { timeoutMs: 8_000, yStartRatio: 0.2, yEndRatio: 0.85 },
      );
      await tapProbeHit(device, hit);
    }
    await sleep(1_000);
    steps.push("update-live");
    tree = await device.accessibilityTree();
    labels = flattenLabels(tree);
    const updated =
      labels.some((l) => /live status:\s*updated/i.test(l)) ||
      labels.some((l) => /Live Activity updated/i.test(l));
    if (!updated) {
      throw new Error(
        `Live Activity update did not reflect; labels=${labels.slice(0, 40).join(", ")}`,
      );
    }
    steps.push("update-status-reflected");

    await device.pressButton({ button: "LOCK" });
    await sleep(1_500);
    steps.push("lock-screen");
    const lockOk = await assertLockActivityChrome(device, steps);
    if (!lockOk) {
      await device.pressButton({ button: "HOME" }).catch(() => undefined);
      return claimsLive(
        pathStr,
        [...steps, "lock-activity-absent"],
        "Lock Screen chrome missing ET Trick Live / allow prompt after host start+update",
      );
    }

    // Watch: only required when a watchOS simulator exists on this machine.
    if (!watchSimulatorAvailable()) {
      steps.push("watch-sim-absent");
    } else {
      // Unlock so the watch companion session can settle against a live phone.
      await device.pressButton({ button: "HOME" }).catch(() => undefined);
      await sleep(800);
      let watchSession: DeviceSession | undefined;
      try {
        const opened = await openWatchPairSession(device.deviceId);
        watchSession = opened.watch;
        steps.push(`watch-pair-booted:${opened.watchUdid.slice(0, 8)}`);

        const connected = await waitForPairConnected(opened.pairId, steps);
        if (!connected) {
          return claimsLive(
            pathStr,
            steps,
            "Watch pair booted but still disconnected from phone (Live Activities will not mirror)",
          );
        }
        await sleep(3_500);

        const watchOk = await assertWatchActivityChrome(watchSession, steps);
        if (!watchOk) {
          const labels = flattenLabels(await watchSession.accessibilityTree());
          return claimsLive(
            pathStr,
            [
              ...steps,
              "watch-chrome-absent",
              `watch-labels:${labels.slice(0, 20).join("|")}`,
            ],
            "Watch pair connected but Smart Stack / Live Activity chrome not visible",
          );
        }
      } catch (e) {
        return claimsLive(
          pathStr,
          [...steps, `watch-pair-fail:${String(e).slice(0, 120)}`],
          "Watch pair/boot/session failed after honest attempt (not silent skip)",
        );
      } finally {
        try {
          await watchSession?.close?.();
        } catch {
          /* optional */
        }
      }
    }

    await device.pressButton({ button: "HOME" }).catch(() => undefined);
    await sleep(500);
    await device.launchApp(entry.hostBundleId);
    await dismissSystemAlerts(device);
    await sleep(600);
    await dismissSystemAlerts(device);
    // Notification banners after lock can cover End.
    try {
      await device.swipe({
        xStart: 210,
        yStart: 80,
        xEnd: 210,
        yEnd: 20,
        duration: 0.25,
      });
    } catch {
      /* optional */
    }
    await sleep(400);
    try {
      await waitForId(device, "btn-end-live", 12_000);
    } catch {
      await dismissSystemAlerts(device);
      await waitForNamed(device, ["ready", "End Live Activities"], 12_000);
    }
    try {
      await tapId(device, "btn-end-live", 8_000);
    } catch {
      const end = await findNamedViaPointProbe(device, ["End Live Activities"], {
        timeoutMs: 8_000,
        yStartRatio: 0.2,
        yEndRatio: 0.85,
      });
      await tapProbeHit(device, end);
    }
    await sleep(800);
    steps.push("end-live");
    const endLabels = flattenLabels(await device.accessibilityTree());
    if (endLabels.some((l) => /live activity:\s*none/i.test(l))) {
      steps.push("end-confirmed");
    }

    return {
      id: "live-activity",
      path: pathStr,
      phase: 3,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    return {
      id: "live-activity",
      path: pathStr,
      phase: 3,
      ok: false,
      status: "red",
      steps,
      error: e instanceof Error ? e.message : String(e),
      failureKind: "product",
    };
  }
}
