/**
 * Broadcast Upload extension — pluginkit floor + os-limit (ReplayKit UI).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import type { TargetJourneyResult } from "../types";
import { runPluginkitOsLimitJourney } from "./pluginkit-os-limit";

export async function runBroadcastUploadJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  return runPluginkitOsLimitJourney(device, {
    id: "broadcast-upload",
    phase: 5,
    extensionPointPattern: /broadcast-services-upload/i,
    stepLabel: "pluginkit-broadcast-upload",
  });
}
