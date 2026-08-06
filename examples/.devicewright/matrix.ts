import fs from "node:fs";
import path from "node:path";
import { devices, type DeviceSession } from "@csark0812/devicewright";
import {
  buildClaimState,
  runMatrix,
  type SuiteMatrixRow,
  type SuiteRowResult,
} from "@csark0812/devicewright/suite";
import { ensureHostReleaseInstall } from "./ensure-install";
import { journeyFor, stubResult } from "./journeys";
import { dismissSystemAlerts } from "./journeys/helpers";
import { assertOsLimitAllowed } from "./claims";
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
  /** Android adb serial (e.g. emulator-5554). Used when platform=android. */
  androidDevice?: string;
  /** Default ios. suite/runMatrix is iOS-only; android uses devices.launch. */
  platform?: "ios" | "android";
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

function normalizeResults(
  rows: RequiredTargetRow[],
  suiteResults: SuiteRowResult[],
): TargetJourneyResult[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return suiteResults.map((r) => {
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
}

function buildSuiteRows(
  rows: RequiredTargetRow[],
  options: RunTargetMatrixOptions,
  platform: "ios" | "android",
): SuiteMatrixRow[] {
  const liveThrough = options.liveThroughPhase ?? 3;
  const stubsOnly = options.stubsOnly === true;

  return rows.map((row) => {
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
    const ensureInstall = options.ensureInstall === true && platform === "ios";
    return {
      id: row.id,
      run: async (device: DeviceSession) => {
        if (ensureInstall) {
          try {
            await ensureHostReleaseInstall({
              id: row.id,
              deviceId: device.deviceId,
            });
            await dismissSystemAlerts(device, 3_000, 4);
          } catch (e) {
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
}

/**
 * Android matrix — suite/runMatrix is iOS-only; drive rows with devices.launch.
 */
async function runAndroidTargetMatrix(
  rows: RequiredTargetRow[],
  options: RunTargetMatrixOptions,
  artifactDir: string,
): Promise<{
  results: TargetJourneyResult[];
  claimState: ReturnType<typeof buildClaimState>;
  artifactDir: string;
  aborted?: boolean;
}> {
  fs.mkdirSync(artifactDir, { recursive: true });
  const failFast = options.failFast !== false;
  const suiteRows = buildSuiteRows(rows, options, "android");
  const liveRows = suiteRows.filter((row) => !row.stub && row.run);
  const results: SuiteRowResult[] = [];

  let device: DeviceSession | undefined;
  try {
    if (liveRows.length > 0) {
      device = await devices.launch({
        platform: "android",
        device: options.androidDevice,
        deviceId: options.androidDevice,
        lock: true,
        boot: false,
      });
    }

    for (const row of suiteRows) {
      if (row.stub || !row.run) {
        results.push({
          id: row.id,
          ok: false,
          status: "stub",
          steps: ["stub"],
          failureKind: "stub",
        });
        continue;
      }
      if (!device) {
        results.push({
          id: row.id,
          ok: false,
          status: "infra",
          steps: [],
          error: "android device session missing",
          failureKind: "infra",
        });
        break;
      }
      const result = await row.run(device);
      fs.writeFileSync(
        path.join(artifactDir, `${row.id}.android.trace.json`),
        JSON.stringify({ result, trace: device.getTrace() }, null, 2),
      );
      results.push(result);
      if (failFast && !result.ok && result.status !== "stub" && result.status !== "os-limit") {
        for (const rest of suiteRows) {
          if (results.some((r) => r.id === rest.id)) continue;
          results.push({
            id: rest.id,
            ok: false,
            status: "stub",
            steps: ["stub"],
            failureKind: "stub",
            error: "skipped after fail-fast abort",
          });
        }
        return {
          results: normalizeResults(rows, results),
          claimState: buildClaimState(results),
          artifactDir,
          aborted: true,
        };
      }
    }
  } finally {
    await device?.close();
  }

  return {
    results: normalizeResults(rows, results),
    claimState: buildClaimState(results),
    artifactDir,
  };
}

/**
 * REQUIRED_V2 matrix — consumer-owned.
 * iOS: DW suite runMatrix. Android: devices.launch + same journey runners.
 * Unknown os-limit (not in claims.ts) fails hard.
 */
export async function runTargetMatrix(options: RunTargetMatrixOptions = {}) {
  const rows = resolveRows(options.ids);
  const platform = options.platform ?? "ios";
  const artifactDir =
    options.artifactDir ??
    path.join(
      repoRoot(),
      "examples/.devicewright/artifacts",
      `targets-${Date.now()}`,
    );

  if (platform === "android") {
    return runAndroidTargetMatrix(rows, options, artifactDir);
  }

  const suiteRows = buildSuiteRows(rows, options, "ios");
  const result = await runMatrix({
    rows: suiteRows,
    iosDevice: options.iosDevice,
    artifactDir,
    failFast: options.failFast !== false,
    idbPath: options.idbPath,
    artifactRoot: repoRoot(),
  });

  return {
    results: normalizeResults(rows, result.results),
    claimState: result.claimState,
    artifactDir: result.artifactDir,
    aborted: result.aborted,
  };
}
