import path from "node:path";
import { runMatrix, type SuiteMatrixRow } from "@csark0812/devicewright/suite";
import { ensureHostReleaseInstall } from "./ensure-install";
import { journeyFor, stubResult } from "./journeys";
import { dismissSystemAlerts } from "./journeys/helpers";
import { assertOsLimitAllowed, claimForId } from "./claims";
import {
  REQUIRED_V2,
  type RequiredTargetRow,
  type TargetPhase,
} from "./required";
import { exampleExists, repoRoot } from "./root";
import type { TargetJourneyResult } from "./types";

export type RunTargetMatrixOptions = {
  ids?: string[];
  liveThroughPhase?: TargetPhase;
  stubsOnly?: boolean;
  iosDevice?: string;
  artifactDir?: string;
  failFast?: boolean;
  idbPath?: string;
  /** When true, Release-build + install missing hosts before each live journey. */
  ensureInstall?: boolean;
};

function resolveRows(ids?: string[]): RequiredTargetRow[] {
  if (!ids?.length) return [...REQUIRED_V2];
  const wanted = new Set(ids);
  const rows = REQUIRED_V2.filter((r) => wanted.has(r.id));
  const missing = ids.filter((id) => !rows.some((r) => r.id === id));
  if (missing.length) {
    throw new Error(`unknown REQUIRED_V2 id(s): ${missing.join(", ")}`);
  }
  return rows;
}

/**
 * REQUIRED_V2 matrix — consumer-owned; uses DW generic runMatrix.
 * Unknown os-limit (not in claims.ts) fails hard.
 */
export async function runTargetMatrix(options: RunTargetMatrixOptions = {}) {
  const rows = resolveRows(options.ids);
  const liveThrough = options.liveThroughPhase ?? 3;
  const stubsOnly = options.stubsOnly === true;
  const artifactDir =
    options.artifactDir ??
    path.join(
      repoRoot(),
      "examples/.devicewright/artifacts",
      `targets-${Date.now()}`,
    );

  const suiteRows: SuiteMatrixRow[] = rows.map((row) => {
    const useStub = stubsOnly || row.phase > liveThrough || !journeyFor(row.id);
    if (!exampleExists(row.path)) {
      return {
        id: row.id,
        async run() {
          return {
            id: row.id,
            path: row.path,
            phase: row.phase,
            ok: false,
            status: "red" as const,
            steps: [],
            error: `missing required path ${row.path}`,
            failureKind: "product",
          };
        },
      };
    }
    if (useStub) {
      return { id: row.id, stub: true };
    }
    const runner = journeyFor(row.id)!;
    const ensureInstall = options.ensureInstall === true;
    return {
      id: row.id,
      run: async (device) => {
        if (ensureInstall) {
          try {
            await ensureHostReleaseInstall({
              id: row.id,
              deviceId: device.deviceId,
            });
            // expo run:ios opens via simctl openurl → “Open in …?”; clear before journey.
            await dismissSystemAlerts(device, 3_000, 4);
          } catch (e) {
            const claim = claimForId(row.id);
            if (claim) {
              return {
                id: row.id,
                path: row.path,
                phase: row.phase,
                ok: true,
                status: "os-limit" as const,
                steps: ["ensure-install"],
                error: `${claim.reason} (ensure-install: ${String(e)})`,
                failureKind: "os-limit" as const,
              };
            }
            return {
              id: row.id,
              path: row.path,
              phase: row.phase,
              ok: false,
              status: "operator" as const,
              steps: ["ensure-install"],
              error: String(e),
              failureKind: "operator" as const,
            };
          }
        }
        return runner(device);
      },
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
    if (r.status === "stub" && meta) {
      return { ...stubResult(meta), error: r.error ?? stubResult(meta).error };
    }
    let status = r.status as TargetJourneyResult["status"];
    let error = r.error;
    let failureKind = r.failureKind as TargetJourneyResult["failureKind"];
    let ok = r.ok;
    if (status === "os-limit") {
      try {
        assertOsLimitAllowed(r.id);
      } catch (e) {
        status = "red";
        ok = false;
        failureKind = "product";
        error = String(e);
      }
    }
    return {
      id: r.id,
      path: meta?.path ?? r.id,
      phase: meta?.phase ?? 1,
      ok,
      status,
      steps: (r.steps as string[]) ?? [],
      error,
      failureKind,
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
