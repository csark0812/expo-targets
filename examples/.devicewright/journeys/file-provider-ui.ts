/**
 * File Provider UI deep journey — Android Document UI Locked P;
 * iOS pluginkit floor + os-limit (no Sim UI path).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import type { TargetJourneyResult } from "../types";
import { runAndroidFileProviderUiJourney } from "./file-provider-ui.android";
import { runPluginkitOsLimitJourney } from "./pluginkit-os-limit";

export async function runFileProviderUiJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidFileProviderUiJourney(device);
  }
  return runPluginkitOsLimitJourney(device, {
    id: "file-provider-ui",
    phase: 5,
    extensionPointPattern: /fileprovider-actionsui/i,
    stepLabel: "pluginkit-file-provider-ui",
  });
}
