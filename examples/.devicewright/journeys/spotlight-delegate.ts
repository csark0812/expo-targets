/**
 * Spotlight-delegate journey — Android host registration status testID;
 * iOS remains Settings→Apps host registration floor.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import type { TargetJourneyResult } from "../types";
import { runAppsSettingsJourney } from "./apps-settings";
import { runAndroidSpotlightDelegateJourney } from "./spotlight-delegate.android";

export async function runSpotlightDelegateJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidSpotlightDelegateJourney(device);
  }
  return runAppsSettingsJourney(device, "spotlight-delegate");
}
