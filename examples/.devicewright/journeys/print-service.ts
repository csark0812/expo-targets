/**
 * Print service journey — Android Print services list Locked P;
 * iOS stays Settings→Apps host registration floor.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import type { TargetJourneyResult } from "../types";
import { runAppsSettingsJourney } from "./apps-settings";
import { runAndroidPrintServiceJourney } from "./print-service.android";

export async function runPrintServiceJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidPrintServiceJourney(device);
  }
  return runAppsSettingsJourney(device, "print-service");
}
