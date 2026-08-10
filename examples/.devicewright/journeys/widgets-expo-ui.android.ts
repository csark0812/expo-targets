import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { pinAndAssertSeededWidget } from "./androidWidgets";
import {
  assertPayloadContains,
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

/**
 * Android expo-ui widget: host setData props → Glance tile shows expo-ui seed.
 * Pins via AppWidgetManager.requestPinAppWidget; rejects name-only greens.
 */
export async function runAndroidWidgetsExpoUiJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["widgets-expo-ui"];
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

    await assertPayloadContains(device, "text-expo-ui-mode", "expo-ui", 4_000);
    steps.push("mode-marker-ok");

    steps.push("seed-payload");
    try {
      await tapId(device, "btn-seed-payload", 8_000);
    } catch {
      const seed = await findNamedViaPointProbe(device, ["Seed payload"], {
        timeoutMs: 6_000,
        match: "exact",
        yStartRatio: 0.3,
        yEndRatio: 0.8,
      });
      await tapProbeHit(device, seed);
    }
    await sleep(500);

    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      "expo-ui",
      8_000,
    );
    steps.push("expo-ui-host-contract-ok");

    await assertPayloadContains(device, "text-expo-ui-seed", "seed:expo-ui", 4_000);
    steps.push("seed-label-ok");

    await pinAndAssertSeededWidget(device, {
      steps,
      hostBundleId: entry.hostBundleId,
      pinButtonTestId: "btn-pin-hello-expo-ui",
      pinButtonName: "Pin Hello Expo UI",
      seedMarkers: [entry.payloadMarker, "expo-ui"],
      providerClassSuffix:
        "com.expotargets.example.widgets.widget.helloexpoui.HelloExpoUiWidgetReceiver",
      hostNames,
    });

    // Glance deepen parity: Bump must be on the seeded tile (not host-only).
    steps.push("assert-bump-control");
    const bumpLabels = flattenLabels(await device.accessibilityTree());
    if (!bumpLabels.some((l) => /\bBump\b/i.test(l))) {
      // Glance Button may sit on another launcher page after pin.
      let found = false;
      for (let page = 0; page < 4 && !found; page++) {
        await device.swipe({
          xStart: 900,
          yStart: 900,
          xEnd: 120,
          yEnd: 900,
          duration: 0.35,
        });
        await sleep(400);
        const labels = flattenLabels(await device.accessibilityTree());
        found = labels.some((l) => /\bBump\b/i.test(l));
      }
      if (!found) {
        throw new Error(
          `expo-ui Glance Bump missing on launcher; labels=${bumpLabels.slice(0, 50).join(", ")}`,
        );
      }
    }
    steps.push("bump-control-ok");

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
