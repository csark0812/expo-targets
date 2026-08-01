import type { TargetPhase } from './required';

/** claim-state status for a REQUIRED_V1 row. */
export type TargetClaimStatus =
  | 'green'
  | 'red'
  | 'stub'
  | 'os-limit'
  | 'operator'
  | 'infra';

export type TargetFailureKind =
  | 'infra'
  | 'operator'
  | 'product'
  | 'os-limit'
  | 'stub';

export type TargetJourneyResult = {
  id: string;
  path: string;
  phase: TargetPhase;
  ok: boolean;
  status: TargetClaimStatus;
  steps: string[];
  error?: string;
  failureKind?: TargetFailureKind;
  screenshotPath?: string | Buffer;
  /** C1 checklist ids asserted (Phase 1), when applicable. */
  checklist?: string[];
};

export type TargetClaimState = {
  surviving: string[];
  cut: string[];
  stub: string[];
  osLimit: string[];
  rows: Array<{
    id: string;
    path: string;
    phase: TargetPhase;
    status: TargetClaimStatus;
    error?: string;
    failureKind?: TargetFailureKind;
  }>;
};
