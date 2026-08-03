/**
 * Intent UI companion journey.
 *
 * Generated alongside `intent` when `ios.intents.ui: true`. Proves the
 * intents-ui-service appex is installed; Siri presentation remains os-limit.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import type { TargetJourneyResult } from "../types";
import { runPluginkitOsLimitJourney } from "./pluginkit-os-limit";

export async function runIntentUiJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  return runPluginkitOsLimitJourney(device, {
    id: "intent-ui",
    phase: 5,
    extensionPointPattern: /intents-ui-service/i,
    stepLabel: "pluginkit-intent-ui",
  });
}
