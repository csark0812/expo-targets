/**
 * REQUIRED_V2 target-suite rows (expo-targets example paths).
 *
 * Cutover (M0):
 * 1. Seed V2 from former REQUIRED_V1 paths (this file).
 * 2. Grow per tranche PR (append rows with example + journey + CLAIMS as needed).
 * 3. CLI/matrix consumers import REQUIRED_V2 only.
 * 4. REQUIRED_V1 removed (no dual-export).
 *
 * Missing path = hard fail. Skip deeper OS only for recorded os-limit + CLAIMS.
 */

export type TargetPhase = 1 | 2 | 3 | 4 | 5;

export type RequiredTargetRow = {
  /** Path relative to repo root (e.g. examples/share). */
  path: string;
  phase: TargetPhase;
  /** Short id for artifacts / CLI filters. */
  id: string;
};

/** Phase 1 share/action C1 hosts (seed from V1). */
export const REQUIRED_V2_PHASE1: readonly RequiredTargetRow[] = [
  { id: "share", path: "examples/share", phase: 1 },
  { id: "action", path: "examples/action", phase: 1 },
  { id: "native-share", path: "examples/native/share", phase: 1 },
  { id: "native-action", path: "examples/native/action", phase: 1 },
] as const;

/** Phase 2 messages + stickers. */
export const REQUIRED_V2_PHASE2: readonly RequiredTargetRow[] = [
  { id: "messages", path: "examples/messages", phase: 2 },
  { id: "stickers", path: "examples/stickers", phase: 2 },
] as const;

/** Phase 3 clip + widgets (+ later native-clip promote in T2). */
export const REQUIRED_V2_PHASE3: readonly RequiredTargetRow[] = [
  { id: "clip", path: "examples/clip", phase: 3 },
  { id: "widgets", path: "examples/widgets", phase: 3 },
  { id: "live-activity", path: "examples/trick", phase: 3 },
] as const;

/** Phase 4 — M1 early stacks (T1–T3); grown by those PRs. */
export const REQUIRED_V2_PHASE4: readonly RequiredTargetRow[] = [
  {
    id: "notification-service",
    path: "examples/notification-service",
    phase: 4,
  },
  {
    id: "notification-content",
    path: "examples/notification-content",
    phase: 4,
  },
  {
    id: "native-notification-content",
    path: "examples/native/notification-content",
    phase: 4,
  },
  { id: "wallet", path: "examples/wallet", phase: 4 },
  { id: "wallet-ui", path: "examples/wallet", phase: 4 },
  { id: "native-clip", path: "examples/native/clip", phase: 4 },
  { id: "safari", path: "examples/safari", phase: 4 },
  { id: "native-safari", path: "examples/native/safari", phase: 4 },
  { id: "content-blocker", path: "examples/content-blocker", phase: 4 },
] as const;

/** Phase 5 — M2+ mid/late stacks; grown by those PRs. */
export const REQUIRED_V2_PHASE5: readonly RequiredTargetRow[] = [
  { id: "app-intent", path: "examples/app-intent", phase: 5 },
  { id: "intent", path: "examples/intent", phase: 5 },
  { id: "intent-ui", path: "examples/intent", phase: 5 },
  {
    id: "credentials-provider",
    path: "examples/credentials-provider",
    phase: 5,
  },
  { id: "account-auth", path: "examples/account-auth", phase: 5 },
  {
    id: "authentication-services",
    path: "examples/authentication-services",
    phase: 5,
  },
  { id: "photo-editing", path: "examples/photo-editing", phase: 5 },
  { id: "file-provider", path: "examples/file-provider", phase: 5 },
  { id: "file-provider-ui", path: "examples/file-provider-ui", phase: 5 },
  { id: "quicklook-thumbnail", path: "examples/quicklook-thumbnail", phase: 5 },
  { id: "quicklook-preview", path: "examples/quicklook-preview", phase: 5 },
  { id: "call-directory", path: "examples/call-directory", phase: 5 },
  { id: "message-filter", path: "examples/message-filter", phase: 5 },
  {
    id: "unwanted-communication",
    path: "examples/unwanted-communication",
    phase: 5,
  },
  { id: "keyboard", path: "examples/keyboard", phase: 5 },
  { id: "broadcast-upload", path: "examples/broadcast-upload", phase: 5 },
  { id: "broadcast-setup-ui", path: "examples/broadcast-setup-ui", phase: 5 },
  {
    id: "device-activity-monitor",
    path: "examples/device-activity-monitor",
    phase: 5,
  },
  { id: "shield-action", path: "examples/shield-action", phase: 5 },
  { id: "shield-config", path: "examples/shield-config", phase: 5 },
  {
    id: "network-packet-tunnel",
    path: "examples/network-packet-tunnel",
    phase: 5,
  },
  { id: "network-app-proxy", path: "examples/network-app-proxy", phase: 5 },
  { id: "network-dns-proxy", path: "examples/network-dns-proxy", phase: 5 },
  { id: "network-filter-data", path: "examples/network-filter-data", phase: 5 },
  { id: "spotlight", path: "examples/spotlight", phase: 5 },
  { id: "spotlight-delegate", path: "examples/spotlight-delegate", phase: 5 },
  { id: "bg-download", path: "examples/bg-download", phase: 5 },
  { id: "location-push", path: "examples/location-push", phase: 5 },
  { id: "matter", path: "examples/matter", phase: 5 },
  { id: "classkit-context", path: "examples/classkit-context", phase: 5 },
  { id: "print-service", path: "examples/print-service", phase: 5 },
  { id: "smart-card", path: "examples/smart-card", phase: 5 },
  { id: "virtual-conference", path: "examples/virtual-conference", phase: 5 },
  { id: "watch", path: "examples/watch", phase: 5 },
  { id: "watch-widget", path: "examples/watch-widget", phase: 5 },
] as const;

/** Optional aggregate — not required for epic green. */
export const OPTIONAL_KITCHEN_SINK: RequiredTargetRow = {
  id: "kitchen-sink",
  path: "examples/kitchen-sink",
  phase: 3,
};

/** Growing REQUIRED_V2 matrix. */
export const REQUIRED_V2: readonly RequiredTargetRow[] = [
  ...REQUIRED_V2_PHASE1,
  ...REQUIRED_V2_PHASE2,
  ...REQUIRED_V2_PHASE3,
  ...REQUIRED_V2_PHASE4,
  ...REQUIRED_V2_PHASE5,
] as const;

export function requiredRowById(id: string): RequiredTargetRow | undefined {
  return REQUIRED_V2.find((r) => r.id === id);
}

export function requiredRowsForPhase(phase: TargetPhase): RequiredTargetRow[] {
  return REQUIRED_V2.filter((r) => r.phase === phase);
}
