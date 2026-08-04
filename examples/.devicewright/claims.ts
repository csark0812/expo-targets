/**
 * Frozen os-limit CLAIMS allowlist.
 * Unknown `os-limit` results fail the local/operator matrix runner.
 * New rows land only in the same tranche PR as the type (grill ownership A).
 */

export type ClaimsEntry = {
  /** REQUIRED matrix id (or type key when 1:1). */
  id: string;
  /** Why deeper OS automation is blocked. */
  reason: string;
  /** Optional operator notes. */
  notes?: string;
};

export const OS_LIMIT_CLAIMS: readonly ClaimsEntry[] = [
  {
    id: "live-activity",
    reason:
      "Lock Screen chrome may be idb-opaque after Always Allow; Watch Smart Stack only when pair is connected (not merely booted). DI / ActivityKit push / StandBy remain non-Sim-faithful. Host start+update+end alone is not green.",
  },
  {
    id: "intent",
    reason:
      "Siri Intent invoke has no reliable Simulator AX path; Settings Apps host registration + pluginkit are the floor",
  },
  {
    id: "intent-ui",
    reason:
      "Intent UI (Siri presentation) is not Sim-drivable via AX; pluginkit intents-ui-service is the floor",
  },
  {
    id: "file-provider-ui",
    reason:
      "File Provider Actions UI has no reliable Simulator entry surface beyond pluginkit fileprovider-actionsui",
  },
  {
    id: "broadcast-upload",
    reason:
      "ReplayKit broadcast upload picker is not Sim-drivable for third-party upload extensions beyond pluginkit",
  },
  {
    id: "broadcast-setup-ui",
    reason:
      "ReplayKit broadcast setup UI is not Sim-drivable beyond pluginkit broadcast-services-setupui",
  },
  {
    id: "wallet",
    reason: "PassKit issuer provisioning requires Apple entitlement allow-list",
  },
  {
    id: "wallet-ui",
    reason: "PassKit issuer provisioning requires Apple entitlement allow-list",
  },
  {
    id: "credentials-provider",
    reason: "AutoFill Settings toggle / ASCredentialProvider UI gated",
  },
  {
    id: "account-auth",
    reason: "Account auth modification requires system Settings",
  },
  { id: "authentication-services", reason: "SSO / AppSSO entitlement gated" },
  { id: "call-directory", reason: "Call Directory Settings enablement" },
  {
    id: "message-filter",
    reason:
      "Messages SMS Filtering / Unknown Senders / Text Message Filter Settings listing or inbound SMS filter invoke is not reliable on Simulator after pluginkit registration (Messages settings pane may render blank; filter surfaces may be absent)",
  },
  {
    id: "spotlight",
    reason:
      "Spotlight import (CSImportExtension) registered but system indexer/search does not reliably surface imported attributes on Simulator",
  },
  {
    id: "device-activity-monitor",
    reason: "Family Controls / DeviceActivity entitlement",
  },
  {
    id: "shield-action",
    reason: "Family Controls / ManagedSettings entitlement",
  },
  {
    id: "shield-config",
    reason: "Family Controls / ManagedSettings entitlement",
  },
  {
    id: "network-packet-tunnel",
    reason: "Network Extension entitlement / VPN personal",
  },
  { id: "network-app-proxy", reason: "Network Extension entitlement" },
  { id: "network-dns-proxy", reason: "Network Extension entitlement" },
  { id: "network-filter-data", reason: "Network Extension entitlement" },
  { id: "location-push", reason: "Location push special entitlement" },
  {
    id: "watch",
    reason:
      "watchOS companion missing from Watch after honest pair+install attempt (iOS Simulator cannot embed watch binaries; Release-watchsimulator product must be simctl-installed onto the watch UDID)",
  },
  {
    id: "watch-widget",
    reason:
      "Paired watchOS Sim boots/connects, but watch-widget nest (companion PlugIns + ET Watch Widget displayName) or companion AX missing after honest pair+install",
  },
] as const;

const BY_ID = new Map(OS_LIMIT_CLAIMS.map((c) => [c.id, c]));

export function claimForId(id: string): ClaimsEntry | undefined {
  return BY_ID.get(id);
}

export function assertOsLimitAllowed(id: string): void {
  if (!BY_ID.has(id)) {
    throw new Error(
      `os-limit claim for "${id}" is not in OS_LIMIT_CLAIMS — add it in the same PR as the type (examples/.devicewright/claims.ts)`,
    );
  }
}
