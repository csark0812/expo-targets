/**
 * Shared pluginkit + os-limit journey floor for entitlement-gated extension types.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { assertOsLimitAllowed, claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { dismissSystemAlerts, waitForNamed } from "./helpers";

export function pluginkitHasAppex(
  udid: string,
  appexId: string,
  extensionPointPattern: RegExp,
): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    extensionPointPattern.test(out)
  );
}

export type PluginkitOsLimitSpec = {
  id: string;
  phase: number;
  /** Appex bundle suffix after host bundle id (defaults to matrix id). */
  appexSuffix?: string;
  extensionPointPattern: RegExp;
  stepLabel: string;
  /** Host-only os-limit (no pluginkit row — e.g. watch companion). */
  hostOnly?: boolean;
};

export async function runPluginkitOsLimitJourney(
  device: DeviceSession,
  spec: PluginkitOsLimitSpec,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[spec.id];
  const path = entry?.path ?? `examples/${spec.id}`;
  const steps: string[] = [];
  const claim = claimForId(spec.id);
  assertOsLimitAllowed(spec.id);

  try {
    if (!entry) throw new Error(`${spec.id}: missing catalog entry`);

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    if (!spec.hostOnly) {
      const suffix = spec.appexSuffix ?? spec.id;
      const appexId = `${entry.hostBundleId}.${suffix}`;
      if (
        !pluginkitHasAppex(device.deviceId, appexId, spec.extensionPointPattern)
      ) {
        throw new Error(
          `${spec.id} appex missing from pluginkit (${appexId})`,
        );
      }
      steps.push(spec.stepLabel);
    } else {
      steps.push("host-only-os-limit");
    }

    return {
      id: spec.id,
      path,
      phase: spec.phase,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error: claim?.reason ?? `${spec.id} — deeper flow os-limit`,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: spec.id,
      path,
      phase: spec.phase,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
