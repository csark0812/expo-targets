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
    id: "notification-content",
    reason:
      "Simulator NCE RN rich UI expand — pluginkit + category delivered; marker required for green",
  },
  {
    id: "live-activity",
    reason:
      "Lock Screen / Dynamic Island Live Activity chrome varies by Simulator model; host ActivityKit start + WidgetKit family is the floor",
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
    reason: "Requires paired watchOS simulator or device for full DoD",
  },
  { id: "watch-widget", reason: "Requires paired watchOS simulator or device" },
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
