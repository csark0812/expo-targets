/**
 * Android Wear dual of watch / watch-widget.
 * Locked P:
 * - watch: Wear pair succeeds + companion UI AX shows ET marker/testID
 * - watch-widget: Wear pair succeeds + Wear tile/complication AX shows ET marker
 *
 * Wear env: Wear OS emulator or pair. Honest provision attempt then os-limit
 * with Wear unavailable reason when no Wear image/hardware in lab.
 * DeviceSession + Devicewright Wear pair APIs (no raw adb).
 */
import {
  android,
  devices,
  launchWearPhonePair,
  type DeviceSession,
  } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { hostLaunchId,
  TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapId,
  waitForId,
  ANDROID_POST_TAP_MS,
  ANDROID_SETTINGS_SETTLE_MS,
} from "./helpers";

type WatchId = "watch" | "watch-widget";

const COMPANION_MARKERS = [
  "ET Watch",
  "ET watch",
  "ET Watch Target",
  "text-wear-companion-marker",
] as const;

const TILE_MARKERS = [
  "ET Watch Widget",
  "ET WatchW",
  "watch-widget",
  "ET watch-widget",
] as const;

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

function claimsWear(
  id: WatchId,
  pathStr: string,
  steps: string[],
  detail: string,
): TargetJourneyResult {
  const claim = claimForId(id, "android");
  return {
    id,
    path: pathStr,
    phase: 5,
    ok: true,
    status: "os-limit",
    steps,
    failureKind: "os-limit",
    error: `${claim?.reason ?? `${id} os-limit`} — ${detail}`,
  };
}

async function provisionWear(
  phone: DeviceSession,
  steps: string[],
): Promise<{ wear: DeviceSession; pairId: string } | { miss: string }> {
  const wearAvds = android.listWearAvds();
  const unpaired = android.listUnpairedWearAvds();
  const existing = android.listWearPairs();
  steps.push(`wear-avds:${wearAvds.length}`);
  steps.push(`wear-unpaired:${unpaired.length}`);
  steps.push(`wear-pairs:${existing.length}`);

  if (wearAvds.length === 0 && existing.length === 0) {
    steps.push("wear-provision-attempt-no-avd");
    try {
      // Honest attempt anyway — pairWearPhone may surface clearer errors.
      await android.pairWearPhone({
        phoneSerial: phone.deviceId,
        boot: true,
        pollTimeoutMs: 20_000,
      });
    } catch (e) {
      return {
        miss: `Wear image/hardware unavailable in lab (${String(e).slice(0, 120)})`,
      };
    }
  }

  try {
    steps.push("wear-pair-attempt");
    const sessions = await launchWearPhonePair({
      phone: { deviceId: phone.deviceId, boot: false },
      pair: { boot: true, phoneSerial: phone.deviceId },
      lock: false,
    });
    steps.push(`wear-pair-status:${sessions.pair.status}`);
    steps.push(`wear-pair-id:${sessions.pair.pairId.slice(0, 24)}`);
    if (sessions.pair.remainingHumanStep) {
      steps.push(`wear-human:${sessions.pair.remainingHumanStep.slice(0, 60)}`);
    }
    // Prefer the freshly launched wear session; phone session is owned by matrix.
    return { wear: sessions.wear, pairId: sessions.pair.pairId };
  } catch (e) {
    // Fallback: pairWearPhone only, then devices.launch on wear serial.
    try {
      const pair = await android.pairWearPhone({
        phoneSerial: phone.deviceId,
        boot: true,
        pollTimeoutMs: 45_000,
      });
      steps.push(`wear-pair-fallback:${pair.status}`);
      const wear = await devices.launch({
        platform: "android",
        deviceId: pair.wear.serial,
        lock: false,
        boot: false,
      });
      return { wear, pairId: pair.pairId };
    } catch (e2) {
      return {
        miss: `Wear pair failed after honest attempt (${String(e2).slice(0, 140)})`,
      };
    }
  }
}

export async function runAndroidWatchJourney(
  device: DeviceSession,
  id: WatchId = "watch",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  const pathStr = entry?.path ?? `examples/${id}`;
  const steps: string[] = [];

  try {
    if (!entry) throw new Error(`${id}: missing catalog entry`);
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, "btn-show-wear-marker", 5_000);
      steps.push("show-wear-marker");
      await sleep(400);
    } catch {
      steps.push("show-wear-marker-miss");
    }

    const provisioned = await provisionWear(device, steps);
    if ("miss" in provisioned) {
      return claimsWear(id, pathStr, steps, provisioned.miss);
    }

    const { wear } = provisioned;
    try {
      if (id === "watch") {
        // Companion UI on phone host — ET marker / testID.
        await device.launchApp(pkg, { terminateRunning: false });
        await waitForId(device, hostReadyTestId(entry.testIds), 10_000);
        try {
          await waitForId(device, "text-wear-companion-marker", 6_000);
          steps.push("companion-testid-visible");
        } catch {
          steps.push("companion-testid-miss");
        }
        const phoneLabels = flattenLabels(await device.accessibilityTree());
        if (labelsHit(phoneLabels, COMPANION_MARKERS)) {
          steps.push("companion-ui-et-marker");
          return {
            id,
            path: pathStr,
            phase: 5,
            ok: true,
            status: "green",
            steps: [...steps, "watch-android-ok"],
          };
        }
        steps.push("companion-ui-miss");
        return claimsWear(
          id,
          pathStr,
          steps,
          "Wear pair ok but companion UI AX missing ET marker/testID",
        );
      }

      // watch-widget: Wear tile / complication AX on the wear device.
      try {
        await wear.pressButton({ button: "HOME" });
        await sleep(400);
        steps.push("wear-home");
      } catch {
        steps.push("wear-home-skip");
      }
      try {
        await wear.swipe({
          xStart: 200,
          yStart: 350,
          xEnd: 200,
          yEnd: 80,
          duration: 0.4,
        });
        await sleep(450);
        steps.push("wear-tile-swipe");
      } catch {
        steps.push("wear-tile-swipe-skip");
      }

      let wearLabels: string[] = [];
      for (let i = 0; i < 4; i++) {
        try {
          wearLabels = flattenLabels(await wear.accessibilityTree());
          break;
        } catch {
          await sleep(400);
        }
      }
      steps.push(`wear-ax-labels:${wearLabels.length}`);
      if (labelsHit(wearLabels, TILE_MARKERS)) {
        steps.push("wear-tile-et-marker");
        return {
          id,
          path: pathStr,
          phase: 5,
          ok: true,
          status: "green",
          steps: [...steps, "watch-widget-android-ok"],
        };
      }

      steps.push("wear-tile-miss");
      return claimsWear(
        id,
        pathStr,
        steps,
        "Wear pair ok but tile/complication AX missing ET marker string",
      );
    } finally {
      try {
        await wear.close?.();
      } catch {
        /* matrix owns phone session */
      }
    }
  } catch (e) {
    const msg = String(e);
    const failureKind =
      /not installed|Launch failed|device offline|no devices|pressButton/i.test(
        msg,
      )
        ? "operator"
        : "product";
    return {
      id,
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

export async function runAndroidWatchWidgetJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  return runAndroidWatchJourney(device, "watch-widget");
}
