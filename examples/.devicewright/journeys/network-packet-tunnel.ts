/**
 * Network packet tunnel journey — Android VPN prepare consent Locked P;
 * iOS remains pluginkit + os-limit (stub cluster).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import type { TargetJourneyResult } from "../types";
import { runAndroidNetworkPacketTunnelJourney } from "./network-packet-tunnel.android";
import { runPluginkitOsLimitJourney } from "./pluginkit-os-limit";

export async function runNetworkPacketTunnelJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidNetworkPacketTunnelJourney(device);
  }
  return runPluginkitOsLimitJourney(device, {
    id: "network-packet-tunnel",
    phase: 5,
    extensionPointPattern: /networkextension\.packet-tunnel/i,
    stepLabel: "pluginkit-network-packet-tunnel",
  });
}
