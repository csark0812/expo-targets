import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { pinAndAssertSeededWidget } from "./androidWidgets";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  hostReadyTestId,
  sleep,
  tapId,
  tapProbeHit,
  waitForId,
  waitForNamed,
} from "./helpers";

/**
 * Android RemoteViews widget: host setData → XML AppWidget tile shows seed.
 * Pins via AppWidgetManager.requestPinAppWidget; rejects name-only greens.
 */
export async function runAndroidWidgetsRemoteViewsJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["widgets-remoteviews"];
  const hostNames = [entry.hostDisplayName, "ET Widgets"].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const steps: string[] = [];

  try {
    steps.push("android-launch-host");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    try {
      await waitForId(device, hostReadyTestId(entry.testIds), 8_000);
    } catch {
      await waitForNamed(device, ["ready"], 15_000);
    }
    steps.push("host-ready");

    await assertPayloadContains(
      device,
      "text-remoteviews-mode",
      "remoteviews",
      4_000,
    );
    steps.push("mode-marker-ok");

    steps.push("seed-payload");
    try {
      await tapId(device, "btn-seed-payload", 8_000);
    } catch {
      const seed = await findNamedViaPointProbe(device, ["Seed payload"], {
        timeoutMs: 6_000,
        match: "exact",
        yStartRatio: 0.2,
        yEndRatio: 0.9,
      });
      await tapProbeHit(device, seed);
    }
    await sleep(500);

    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      "remoteviews",
      8_000,
    );
    steps.push("remoteviews-host-contract-ok");

    await assertPayloadContains(
      device,
      "text-remoteviews-seed",
      "seed:remoteviews",
      4_000,
    );
    steps.push("seed-label-ok");

    await pinAndAssertSeededWidget(device, {
      steps,
      hostBundleId: entry.hostBundleId,
      pinButtonTestId: "btn-pin-hello-remoteviews",
      pinButtonName: "Pin Hello RemoteViews",
      seedMarkers: [entry.payloadMarker, "remoteviews"],
      providerClassSuffix:
        "com.expotargets.example.widgets.widget.helloremoteviews.HelloRemoteViewsProvider",
      hostNames,
    });

    return {
      id: entry.id,
      path: entry.path,
      phase: 3,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind =
      /not installed|Launch failed|device offline|no devices|pressButton/i.test(
        msg,
      )
        ? "operator"
        : "product";
    return {
      id: entry.id,
      path: entry.path,
      phase: 3,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
