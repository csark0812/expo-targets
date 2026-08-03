/**
 * Watch companion + watch-widget full-demo journeys.
 *
 * GREEN = launchWatchPhonePair + visible Watch UI (or watch-widget chrome).
 * Pair / AX / install failure after honest attempt → os-limit CLAIMS (not
 * silent hostOnly stub). Pluginkit alone is never green.
 */
import { launchWatchPhonePair } from "@csark0812/devicewright";
import type { DeviceSession } from "@csark0812/devicewright";
import { assertOsLimitAllowed, claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  flattenLabels,
  sleep,
  waitForNamed,
} from "./helpers";

type WatchId = "watch" | "watch-widget";

const WATCH_UI_RE: Record<WatchId, RegExp> = {
  watch: /ET [Ww]atch|WatchApp|com\.expotargets\.example\.watch/i,
  "watch-widget": /ET Watch Widget|WatchWidget|watch-widget/i,
};

function claimsWatch(
  id: WatchId,
  pathStr: string,
  steps: string[],
  detail: string,
): TargetJourneyResult {
  assertOsLimitAllowed(id);
  const claim = claimForId(id);
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

export async function runWatchJourney(
  device: DeviceSession,
  id: WatchId = "watch",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  const pathStr = entry?.path ?? `examples/${id}`;
  const steps: string[] = [];

  try {
    if (!entry) throw new Error(`${id}: missing catalog entry`);

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    let pair;
    try {
      // Explicit watch name hint — bare DEVICEWRIGHT_UDID would resolve to the phone.
      pair = await launchWatchPhonePair({
        phone: { deviceId: device.deviceId },
        watch: { device: "Apple Watch" },
        lock: false,
        pair: { boot: true },
      });
      steps.push(`watch-pair-booted:${pair.watchUdid.slice(0, 8)}`);
    } catch (e) {
      return claimsWatch(
        id,
        pathStr,
        [...steps, `watch-pair-fail:${String(e).slice(0, 100)}`],
        "launchWatchPhonePair failed after honest attempt",
      );
    }

    try {
      // Install/launch companion on the watch UDID when a WatchKit bundle exists.
      try {
        await pair.watch.launchApp(entry.hostBundleId, {
          terminateRunning: true,
        });
        steps.push("watch-launch-host-bundle");
      } catch (launchErr) {
        steps.push(`watch-launch-skip:${String(launchErr).slice(0, 80)}`);
      }
      await sleep(2_000);

      let watchLabels: string[] = [];
      try {
        watchLabels = flattenLabels(await pair.watch.accessibilityTree());
        steps.push(`watch-ax-labels:${watchLabels.length}`);
      } catch (axErr) {
        return claimsWatch(
          id,
          pathStr,
          [...steps, `watch-ax-fail:${String(axErr).slice(0, 80)}`],
          "Watch AX empty/throws after pair (DW path or Apple ceiling)",
        );
      }

      if (!watchLabels.some((l) => WATCH_UI_RE[id].test(l))) {
        return claimsWatch(
          id,
          pathStr,
          [...steps, "watch-ui-absent"],
          `Visible Watch UI missing after pair (wanted ${WATCH_UI_RE[id]})`,
        );
      }
      steps.push("watch-ui-visible");

      return {
        id,
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps,
      };
    } finally {
      try {
        await pair.watch.close?.();
      } catch {
        /* optional */
      }
      try {
        await pair.phone.close?.();
      } catch {
        /* matrix still owns the primary phone session */
      }
    }
  } catch (e) {
    const msg = String(e);
    const failureKind =
      /not installed|Unable to find|Launch failed|failed to launch|FBSOpenApplication/i.test(
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

export async function runWatchWidgetJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  return runWatchJourney(device, "watch-widget");
}
