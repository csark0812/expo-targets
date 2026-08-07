/**
 * Credentials provider journey — Android Autofill list Locked P;
 * iOS remains pluginkit + os-limit (stub cluster).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import type { TargetJourneyResult } from "../types";
import { runAndroidCredentialsProviderJourney } from "./credentials-provider.android";
import { runPluginkitOsLimitJourney } from "./pluginkit-os-limit";

export async function runCredentialsProviderJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidCredentialsProviderJourney(device);
  }
  return runPluginkitOsLimitJourney(device, {
    id: "credentials-provider",
    phase: 5,
    extensionPointPattern: /authentication-services-credential-provider-ui/i,
    stepLabel: "pluginkit-credentials-provider",
  });
}
