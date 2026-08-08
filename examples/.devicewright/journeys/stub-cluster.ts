/**
 * Pluginkit + os-limit journeys for T5/T9/T10/T12 stub cluster types.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import type { TargetJourneyResult } from "../types";
import {
  type PluginkitOsLimitSpec,
  runPluginkitOsLimitJourney,
} from "./pluginkit-os-limit";

const STUB_SPECS: readonly PluginkitOsLimitSpec[] = [
  {
    id: "account-auth",
    phase: 5,
    extensionPointPattern:
      /authentication-services-account-authentication-modification-ui/i,
    stepLabel: "pluginkit-account-auth",
  },
  {
    id: "authentication-services",
    phase: 5,
    extensionPointPattern: /AppSSO\.idp-extension/i,
    stepLabel: "pluginkit-authentication-services",
  },
  {
    id: "device-activity-monitor",
    phase: 5,
    extensionPointPattern: /deviceactivity\.monitor-extension/i,
    stepLabel: "pluginkit-device-activity-monitor",
  },
  {
    id: "shield-action",
    phase: 5,
    extensionPointPattern: /ManagedSettings\.shield-action-service/i,
    stepLabel: "pluginkit-shield-action",
  },
  {
    id: "shield-config",
    phase: 5,
    extensionPointPattern: /ManagedSettingsUI\.shield-configuration-service/i,
    stepLabel: "pluginkit-shield-config",
  },
  {
    id: "network-app-proxy",
    phase: 5,
    extensionPointPattern: /networkextension\.app-proxy/i,
    stepLabel: "pluginkit-network-app-proxy",
  },
  {
    id: "network-dns-proxy",
    phase: 5,
    extensionPointPattern: /networkextension\.dns-proxy/i,
    stepLabel: "pluginkit-network-dns-proxy",
  },
  {
    id: "network-filter-data",
    phase: 5,
    extensionPointPattern: /networkextension\.filter-data/i,
    stepLabel: "pluginkit-network-filter-data",
  },
] as const;

const RUNNERS = new Map<string, (d: DeviceSession) => Promise<TargetJourneyResult>>(
  STUB_SPECS.map((spec) => [
    spec.id,
    (device: DeviceSession) => runPluginkitOsLimitJourney(device, spec),
  ]),
);

export function runStubClusterJourney(
  device: DeviceSession,
  id: string,
): Promise<TargetJourneyResult> {
  const runner = RUNNERS.get(id);
  if (!runner) {
    throw new Error(`stub-cluster: no spec for ${id}`);
  }
  return runner(device);
}

export function stubClusterJourneyFor(
  id: string,
): ((device: DeviceSession) => Promise<TargetJourneyResult>) | undefined {
  return RUNNERS.get(id);
}
