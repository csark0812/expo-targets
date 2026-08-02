/**
 * Generic host-registration journey: host ready → Settings → Apps →
 * search host display name → host settings page renders.
 *
 * Proof level: "Settings Apps host registration" — the OS lists the host
 * app and its settings surface opens. This does NOT prove the extension's
 * OS-side capability (Siri invoke, AutoFill picker, Files enumeration,
 * etc.) — those need deeper per-type journeys or a CLAIMS os-limit entry.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { dismissSystemAlerts, waitForNamed } from "./helpers";
import { openSettingsApps, searchAppsAndOpen } from "./settings-nav";

export async function runAppsSettingsJourney(
  device: DeviceSession,
  id: string,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  const path = entry?.path ?? `examples/${id}`;
  const steps: string[] = [];
  try {
    if (!entry) throw new Error(`apps-settings: unknown catalog id ${id}`);

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const hostLabels = [entry.hostDisplayName, ...entry.extensionAliases].filter(
      Boolean,
    );
    await openSettingsApps(device, steps);
    await searchAppsAndOpen(device, entry.hostDisplayName, hostLabels, steps);

    const claim = claimForId(id);
    if (claim) {
      return {
        id,
        path,
        phase: 5,
        ok: true,
        status: "os-limit",
        steps,
        failureKind: "os-limit",
        error: claim.reason,
      };
    }

    return {
      id,
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
      id,
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
