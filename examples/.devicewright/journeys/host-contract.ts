import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { dismissSystemAlerts, waitForNamed } from "./helpers";

/**
 * Generic host-contract journey for thin example hosts.
 * Asserts ready marker; if CLAIMS row exists, returns os-limit after touchpoint.
 *
 * iOS 26: scaffold testIDs often surface as labels only (no AXUniqueId), so
 * wait on the “ready” label rather than waitForId("screen-root").
 */
export async function runHostContractJourney(
  device: DeviceSession,
  id: string,
): Promise<TargetJourneyResult> {
  const cat = TARGET_CATALOG[id];
  const path = cat?.path ?? `examples/${id}`;
  const steps: string[] = [];
  try {
    // Cancel leftover “Open in …?” from ensure-install’s URL launch, then
    // cold-launch by bundle id (avoids another openurl sheet).
    await dismissSystemAlerts(device);
    await device.launchApp(cat?.hostBundleId ?? "", {
      terminateRunning: true,
    });
    steps.push("launch");
    await dismissSystemAlerts(device);
    steps.push("dismiss-alerts");
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("ready");

    const claim = claimForId(id);
    if (claim) {
      return {
        id,
        path,
        phase: 4,
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
      phase: 4,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    return {
      id,
      path,
      phase: 4,
      ok: false,
      status: "red",
      steps,
      error: String(e),
      failureKind: "product",
    };
  }
}
