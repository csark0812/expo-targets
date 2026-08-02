/**
 * Siri Intent host-registration journey.
 *
 * GREEN proof level: host ready + Settings Apps lists the host and its
 * settings surface opens. `IntentsSupported` in Info.plist is a build-time
 * contract already asserted elsewhere (Info.plist inspection) — this
 * journey does NOT attempt an actual Siri invoke (no reliable simulator
 * automation path for that exists today) and does NOT claim it succeeded.
 * `intent` has no CLAIMS row: we are not claiming an os-limit for Siri
 * invoke, we are simply not attempting it.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { dismissSystemAlerts, waitForNamed } from "./helpers";
import { openSettingsApps, searchAppsAndOpen } from "./settings-nav";

export async function runIntentJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.intent;
  const path = entry?.path ?? "examples/intent";
  const steps: string[] = [];
  const hostLabels = [entry.hostDisplayName, ...entry.extensionAliases].filter(
    Boolean,
  );

  try {
    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    await openSettingsApps(device, steps);
    await searchAppsAndOpen(device, entry.hostDisplayName, hostLabels, steps);
    steps.push("host-settings-ok");
    steps.push("siri-invoke-not-attempted");

    return {
      id: "intent",
      path,
      phase: 5,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "intent",
      path,
      phase: 5,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
