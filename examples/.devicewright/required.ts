/**
 * Frozen REQUIRED_V1 target-suite rows (expo-targets example paths).
 * Missing path = hard fail. Later-phase Phase 0 rows report claim-state `stub`
 * (not green). Skip only for recorded OS-limit + CLAIMS review.
 */

export type TargetPhase = 1 | 2 | 3;

export type RequiredTargetRow = {
  /** Path relative to EXPO_TARGETS_ROOT (e.g. examples/share). */
  path: string;
  phase: TargetPhase;
  /** Short id for artifacts / CLI filters. */
  id: string;
};

/** Phase 1 share/action C1 hosts. */
export const REQUIRED_V1_PHASE1: readonly RequiredTargetRow[] = [
  { id: 'share', path: 'examples/share', phase: 1 },
  { id: 'action', path: 'examples/action', phase: 1 },
  { id: 'native-share', path: 'examples/native/share', phase: 1 },
  { id: 'native-action', path: 'examples/native/action', phase: 1 },
] as const;

/** Phase 2 messages + stickers. */
export const REQUIRED_V1_PHASE2: readonly RequiredTargetRow[] = [
  { id: 'messages', path: 'examples/messages', phase: 2 },
  { id: 'stickers', path: 'examples/stickers', phase: 2 },
] as const;

/** Phase 3 clip + widgets. */
export const REQUIRED_V1_PHASE3: readonly RequiredTargetRow[] = [
  { id: 'clip', path: 'examples/clip', phase: 3 },
  { id: 'widgets', path: 'examples/widgets', phase: 3 },
] as const;

/** Optional aggregate — not required for epic green. */
export const OPTIONAL_KITCHEN_SINK: RequiredTargetRow = {
  id: 'kitchen-sink',
  path: 'examples/kitchen-sink',
  phase: 3,
};

/** Frozen REQUIRED_V1 — all epic must-prove rows. */
export const REQUIRED_V1: readonly RequiredTargetRow[] = [
  ...REQUIRED_V1_PHASE1,
  ...REQUIRED_V1_PHASE2,
  ...REQUIRED_V1_PHASE3,
] as const;

export function requiredRowById(id: string): RequiredTargetRow | undefined {
  return REQUIRED_V1.find((r) => r.id === id);
}

export function requiredRowsForPhase(phase: TargetPhase): RequiredTargetRow[] {
  return REQUIRED_V1.filter((r) => r.phase === phase);
}
