/**
 * Broadcast Setup UI extension — pluginkit floor + os-limit (ReplayKit UI).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import type { TargetJourneyResult } from "../types";
import { runPluginkitOsLimitJourney } from "./pluginkit-os-limit";

export async function runBroadcastSetupUiJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  return runPluginkitOsLimitJourney(device, {
    id: "broadcast-setup-ui",
    phase: 5,
    extensionPointPattern: /broadcast-services-setupui/i,
    stepLabel: "pluginkit-broadcast-setup-ui",
  });
}
