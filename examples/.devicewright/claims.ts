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
    id: "content-blocker",
    reason:
      "Safari content-blocker network block is inconclusive on Simulator after Allow On (DNS vs extension indistinguishable)",
  },
  {
    id: "stickers",
    reason:
      "Sticker pack insert cells are AX-opaque on Simulator after named Fun Stickers; CLAIMS only when insert proof is exhausted (ambient message/sticker labels are not green)",
  },
  {
    id: "keyboard",
    reason:
      "Settings → Keyboards enable + ET Keyboard key attribution is often opaque on Simulator (globe / Next Keyboard / custom key AX); pluginkit + device.type soft-green removed",
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
      "Paired watchOS Sim may boot via launchWatchPhonePair but WatchKit companion UI remains absent/opaque after honest install+AX (Apple ceiling — not silent hostOnly)",
  },
  {
    id: "watch-widget",
    reason:
      "Paired watchOS Sim may boot but Watch widget chrome (ET Watch Widget) is not reliably visible after honest pair+AX",
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
