/**
 * Frozen os-limit CLAIMS allowlist.
 * Unknown `os-limit` results fail the local/operator matrix runner.
 * New rows land only in the same tranche PR as the type (grill ownership A).
 *
 * `platforms` defaults to `["ios"]` when omitted (legacy iOS-only rows).
 * Android draft rows must set `platforms: ["android"]` with Android-worded reasons.
 */

export type ClaimsPlatform = "ios" | "android";

export type ClaimsEntry = {
  /** REQUIRED matrix id (or type key when 1:1). */
  id: string;
  /** Why deeper OS automation is blocked. */
  reason: string;
  /** Optional operator notes. */
  notes?: string;
  /** Defaults to ["ios"] when omitted (legacy iOS-only rows). */
  platforms?: readonly ClaimsPlatform[];
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
  {
    id: "call-directory",
    reason:
      "Phone → Call Blocking & Identification is unavailable on non-telephony Sims (Air): Settings Apps→Phone confirm on Call Blocking / Announce Calls times out; Settings search “Call Blocking” finds no usable surface — cannot list or enable ET CallDir Target (pluginkit alone is not green)",
  },
  {
    id: "message-filter",
    reason:
      "Messages Settings detail is AX-blank on Simulator (Apps→Messages often Settings|Apps|BackButton only); Unknown Senders / Text Message Filter / Manage Filtering / SMS Filtering Settings search returns no results; App-prefs:com.apple.MobileSMS / App-prefs:MESSAGES are no-ops on this Sim — cannot list or enable ET MsgFilter Target or prove inbound filter invoke",
  },
  {
    id: "unwanted-communication",
    reason:
      "Phone → SMS/Call Reporting (and Settings search for SMS/Call Reporting / Call Reporting) is unavailable on Air / non-telephony Sims; Apps→Phone confirm times out like Call Blocking — cannot list ET Unwanted Target despite classification-ui pluginkit registration",
  },
  {
    id: "spotlight",
    reason:
      "CSImportExtension + UTI register and Files can open et-import.etspot on Simulator, but importer never writes App Group markers (mdimport unavailable in simctl; Spotlight search alone is untrusted)",
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

  // --- Android draft rows (Phase 0b allowlist; live exits land with journeys) ---
  {
    id: "credentials-provider",
    platforms: ["android"],
    reason:
      "Autofill settings list may not show this AutofillService after honest Settings open attempt (OEM/Settings leftover)",
  },
  {
    id: "call-directory",
    platforms: ["android"],
    reason:
      "Call Screening settings UI may not list this CallScreeningService after honest attempt",
  },
  {
    id: "print-service",
    platforms: ["android"],
    reason:
      "Print services Settings may not list this PrintService after honest attempt",
  },
  {
    id: "network-packet-tunnel",
    platforms: ["android"],
    reason:
      "System VPN consent/prepare UI may be unavailable or non-AX after honest VpnService prepare attempt",
  },
  {
    id: "file-provider-ui",
    platforms: ["android"],
    reason:
      "Opening a document may not surface FileProvUI chooser row + Activity chrome after honest DocumentsUI attempt",
  },
  {
    id: "notification-service",
    platforms: ["android"],
    reason:
      "Shade mutation may be unreachable after honest local/pre-display attempt (incl. FCM-transport-only)",
  },
  {
    id: "app-intent",
    platforms: ["android"],
    reason:
      "App Actions/shortcuts list may not show ET shortcut after honest attempt",
  },
  {
    id: "photo-editing",
    platforms: ["android"],
    reason:
      "ACTION_EDIT editor→save→host marker may be unreachable after honest attempt",
  },
  {
    id: "wallet",
    platforms: ["android"],
    reason:
      "Google Wallet/pass host surface unavailable after honest attempt on Google APIs+Play image (or Play Store image unavailable in lab)",
  },
  {
    id: "wallet-ui",
    platforms: ["android"],
    reason:
      "Companion/issuer Activity chrome unavailable after honest attempt (or Play Store image unavailable in lab)",
  },
  {
    id: "spotlight",
    platforms: ["android"],
    reason:
      "AppSearch query hit with ET marker may be unreachable after honest index+query attempt",
  },
  {
    id: "spotlight-delegate",
    platforms: ["android"],
    reason:
      "Host registration status testID may not appear after honest attempt (not dumpsys alone)",
  },
  {
    id: "bg-download",
    platforms: ["android"],
    reason:
      "Host marker may not update on Download/WorkManager completion after honest enqueue attempt",
  },
  {
    id: "message-filter",
    platforms: ["android"],
    reason:
      "Filter settings UI may not list this service after honest Settings attempt",
  },
  {
    id: "unwanted-communication",
    platforms: ["android"],
    reason:
      "Reporting/screening extras UI may not list this service after honest attempt",
  },
  {
    id: "watch",
    platforms: ["android"],
    reason:
      "Wear pair + companion AX miss after honest attempt, or Wear image/hardware unavailable in lab",
  },
  {
    id: "watch-widget",
    platforms: ["android"],
    reason:
      "Wear pair + tile AX miss after honest attempt, or Wear image/hardware unavailable in lab",
  },
] as const;

function claimPlatforms(entry: ClaimsEntry): readonly ClaimsPlatform[] {
  return entry.platforms ?? ["ios"];
}

export function claimForId(
  id: string,
  platform?: ClaimsPlatform,
): ClaimsEntry | undefined {
  const matches = OS_LIMIT_CLAIMS.filter((c) => c.id === id);
  if (!matches.length) return undefined;
  if (platform === undefined) {
    return (
      matches.find((c) => claimPlatforms(c).includes("ios")) ?? matches[0]
    );
  }
  return matches.find((c) => claimPlatforms(c).includes(platform));
}

export function claimAllowsPlatform(
  id: string,
  platform: ClaimsPlatform,
): boolean {
  return OS_LIMIT_CLAIMS.some(
    (c) => c.id === id && claimPlatforms(c).includes(platform),
  );
}

export function assertOsLimitAllowed(
  id: string,
  platform?: ClaimsPlatform,
): void {
  const matches = OS_LIMIT_CLAIMS.filter((c) => c.id === id);
  if (!matches.length) {
    throw new Error(
      `os-limit claim for "${id}" is not in OS_LIMIT_CLAIMS — add it in the same PR as the type (examples/.devicewright/claims.ts)`,
    );
  }
  if (platform !== undefined && !claimAllowsPlatform(id, platform)) {
    throw new Error(
      `os-limit claim for "${id}" does not include platform "${platform}" — Android needs an Android-worded CLAIMS row (platforms: ["android"]) in examples/.devicewright/claims.ts`,
    );
  }
}
