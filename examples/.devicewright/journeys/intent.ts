/**
 * Siri Intent host-registration journey.
 *
 * GREEN is not claimed for Siri invoke (no reliable Simulator path). After
 * host ready + Settings Apps lists the host, return os-limit (CLAIMS).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { assertOsLimitAllowed, claimForId } from "../claims";
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
    assertOsLimitAllowed("intent");
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

    const claim = claimForId("intent");
    return {
      id: "intent",
      path,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error: claim?.reason ?? "Siri Intent invoke not Sim-drivable",
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
