import path from 'node:path';
import { runMatrix, type SuiteMatrixRow } from '@csark0812/devicewright/suite';
import { journeyFor, stubResult } from './journeys';
import {
  REQUIRED_V1,
  type RequiredTargetRow,
  type TargetPhase,
} from './required';
import { exampleExists, repoRoot } from './root';
import type { TargetJourneyResult } from './types';

export type RunTargetMatrixOptions = {
  ids?: string[];
  liveThroughPhase?: TargetPhase;
  stubsOnly?: boolean;
  iosDevice?: string;
  artifactDir?: string;
  failFast?: boolean;
  idbPath?: string;
};

function resolveRows(ids?: string[]): RequiredTargetRow[] {
  if (!ids?.length) return [...REQUIRED_V1];
  const wanted = new Set(ids);
  const rows = REQUIRED_V1.filter((r) => wanted.has(r.id));
  const missing = ids.filter((id) => !rows.some((r) => r.id === id));
  if (missing.length) {
    throw new Error(`unknown REQUIRED_V1 id(s): ${missing.join(', ')}`);
  }
  return rows;
}

/**
 * REQUIRED_V1 matrix — consumer-owned; uses DW generic runMatrix.
 */
export async function runTargetMatrix(options: RunTargetMatrixOptions = {}) {
  const rows = resolveRows(options.ids);
  const liveThrough = options.liveThroughPhase ?? 3;
  const stubsOnly = options.stubsOnly === true;
  const artifactDir =
    options.artifactDir ??
    path.join(
      repoRoot(),
      'examples/.devicewright/artifacts',
      `targets-${Date.now()}`
    );

  const suiteRows: SuiteMatrixRow[] = rows.map((row) => {
    const useStub =
      stubsOnly || row.phase > liveThrough || !journeyFor(row.id);
    if (!exampleExists(row.path)) {
      return {
        id: row.id,
        async run() {
          return {
            id: row.id,
            path: row.path,
            phase: row.phase,
            ok: false,
            status: 'red' as const,
            steps: [],
            error: `missing required path ${row.path}`,
            failureKind: 'product',
          };
        },
      };
    }
    if (useStub) {
      return { id: row.id, stub: true };
    }
    const runner = journeyFor(row.id)!;
    return {
      id: row.id,
      run: async (device) => runner(device),
    };
  });

  const result = await runMatrix({
    rows: suiteRows,
    iosDevice: options.iosDevice,
    artifactDir,
    failFast: options.failFast !== false,
    idbPath: options.idbPath,
    artifactRoot: repoRoot(),
  });

  const byId = new Map(rows.map((r) => [r.id, r]));
  const results: TargetJourneyResult[] = result.results.map((r) => {
    const meta = byId.get(r.id);
    if (r.status === 'stub' && meta) {
      return { ...stubResult(meta), error: r.error ?? stubResult(meta).error };
    }
    return {
      id: r.id,
      path: meta?.path ?? r.id,
      phase: meta?.phase ?? 1,
      ok: r.ok,
      status: r.status as TargetJourneyResult['status'],
      steps: (r.steps as string[]) ?? [],
      error: r.error,
      failureKind: r.failureKind as TargetJourneyResult['failureKind'],
      checklist: (r as { checklist?: string[] }).checklist,
    };
  });

  return {
    results,
    claimState: result.claimState,
    artifactDir: result.artifactDir,
    aborted: result.aborted,
  };
}
