/**
 * Bg-download journey — Android Download/WorkManager host marker;
 * iOS remains Settings→Apps host registration floor.
 */
import type { DeviceSession } from "../driver";
import type { TargetJourneyResult } from "../types";
import { runAppsSettingsJourney } from "./apps-settings";
import { runAndroidBgDownloadJourney } from "./bg-download.android";

export async function runBgDownloadJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidBgDownloadJourney(device);
  }
  return runAppsSettingsJourney(device, "bg-download");
}
