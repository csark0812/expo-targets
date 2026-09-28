import fs from "node:fs";
import path from "node:path";
import {
  classifyAgentDeviceFailure,
  devices,
  type DeviceSession,
} from "./driver";
import {
  appendSuiteEvent,
  bindMatrixActStream,
  buildClaimState,
  matrixActsEnabled,
  runMatrix,
  type SuiteMatrixEvent,
  type SuiteMatrixRow,
  type SuiteRowResult,
} from "./suite";
import { ensureHostReleaseInstall } from "./ensure-install";
import { journeyFor, stubResult } from "./journeys";
import { dismissSystemAlerts } from "./journeys/helpers";
import { assertOsLimitAllowed } from "./claims";
import {
  REQUIRED_ANDROID,
  REQUIRED_ANDROID_IDS,
  REQUIRED_V2,
  type RequiredTargetRow,
  type TargetPhase,
} from "./required";
import { exampleExists, repoRoot } from "./root";
import type { TargetJourneyResult } from "./types";
import { blockingCapabilities } from "./capabilities";
import { AgentDeviceCapabilityError } from "./driver";
import { finishRunManifest, writeRunManifest } from "./run-manifest";

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
  /** Live progress / lock heartbeats (also in events.jsonl). */
  onEvent?: (event: SuiteMatrixEvent) => void;
  /** Operator-produced digest manifest for the exact installed Release binaries. */
  releaseBuildManifestPath?: string;
  /**
   * Stream TraceSteps as `act` events (default on).
   * `false` or `AGENT_DEVICE_MATRIX_ACTS=0|off|false` disables.
   */
  streamActs?: boolean;
};

const SOFT_GREEN_STEP = /^(launch-host|hyphen-ok|pm-path|dumpsys)/i;
const EMPTY_SURFACE_STEP = /^(launch-host|hyphen-ok)$/i;

function failedJourney(
  row: RequiredTargetRow,
  error: unknown,
): TargetJourneyResult {
  const failureKind = classifyAgentDeviceFailure(error);
  return {
    id: row.id,
    path: row.path,
    phase: row.phase,
    ok: false,
    status:
      failureKind === "infra"
        ? "infra"
        : failureKind === "operator"
          ? "operator"
          : "red",
    steps: [],
    error: String(error),
    failureKind,
  };
}

/**
 * Soft-green = status green while every step is soft-exit evidence only.
 * Throws so callers can convert to hard red.
 */
export function assertNotSoftGreen(result: {
  status: string;
  steps: readonly string[];
}): void {
  if (result.status !== "green") return;
  if (!result.steps.length) return;
  if (result.steps.every((s) => SOFT_GREEN_STEP.test(s))) {
    throw new Error(
      `soft-green: green with only soft-exit steps (${result.steps.join(", ")})`,
    );
  }
}

function resolveRows(
  ids: string[] | undefined,
  platform: "ios" | "android",
): RequiredTargetRow[] {
  if (platform === "android") {
    const androidIdSet = new Set<string>(REQUIRED_ANDROID_IDS);
    if (!ids?.length) return [...REQUIRED_ANDROID];
    const missing = ids.filter((id) => !androidIdSet.has(id));
    if (missing.length) {
      throw new Error(
        `id(s) not in REQUIRED_ANDROID: ${missing.join(", ")}`,
      );
    }
    return REQUIRED_ANDROID.filter((r) => ids.includes(r.id));
  }

  if (!ids?.length) return [...REQUIRED_V2];
  const wanted = new Set(ids);
  const rows = REQUIRED_V2.filter((r) => wanted.has(r.id));
  const missing = ids.filter((id) => !rows.some((r) => r.id === id));
  if (missing.length) {
    throw new Error(`unknown REQUIRED_V2 id(s): ${missing.join(", ")}`);
  }
  return rows;
}

export function normalizeResults(
  rows: RequiredTargetRow[],
  suiteResults: SuiteRowResult[],
  platform: "ios" | "android",
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
    const steps = (r.steps as string[]) ?? [];

    if (status === "operator") {
      ok = false;
      failureKind = failureKind ?? "operator";
    }

    try {
      assertNotSoftGreen({ status, steps });
    } catch (e) {
      status = "red";
      ok = false;
      failureKind = "product";
      error = String(e);
    }

    if (
      status === "os-limit" &&
      steps.length > 0 &&
      steps.every((s) => EMPTY_SURFACE_STEP.test(s))
    ) {
      status = "red";
      ok = false;
      failureKind = "product";
      error =
        "empty-surface: os-limit with only launch-host/hyphen-ok steps (no honest Locked P attempt)";
    }

    if (status === "os-limit") {
      try {
        assertOsLimitAllowed(
          r.id,
          platform === "android" ? "android" : undefined,
        );
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
      steps,
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
 * Mirrors suite event/artifact writes (events.jsonl, .result.json, claim-state).
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
  runError?: string;
}> {
  fs.mkdirSync(artifactDir, { recursive: true });
  const failFast = options.failFast !== false;
  const suiteRows = buildSuiteRows(rows, options, "android");
  const liveRows = suiteRows.filter((row) => !row.stub && row.run);
  const results: SuiteRowResult[] = [];
  const total = suiteRows.length;
  const onEvent = options.onEvent;

  appendSuiteEvent(
    artifactDir,
    {
      v: 1,
      event: "matrix.start",
      total,
      platform: "android",
      device: options.androidDevice,
    },
    onEvent,
  );

  let device: DeviceSession | undefined;
  let aborted = false;
  let runError: string | undefined;
  try {
    if (liveRows.length > 0) {
      // Fail-fast on foreign PID lock (MCP often holds the emulator). Library
      // default waits 2h — that looks like a hang. Override via env if needed.
      const lockWaitMs = Number(
        process.env.AGENT_DEVICE_LOCK_WAIT_MS?.trim() || "0",
      );
      try {
        device = await devices.launch({
          platform: "android",
          device: options.androidDevice,
          deviceId: options.androidDevice,
          lock: true,
          lockWaitMs: Number.isFinite(lockWaitMs) ? lockWaitMs : 0,
          boot: false,
          artifactDir,
        });
      } catch (error) {
        runError = `device launch failed: ${String(error)}`;
        appendSuiteEvent(
          artifactDir,
          { v: 1, event: "matrix.device-error", error: runError },
          onEvent,
        );
      }
    }

    for (let i = 0; i < suiteRows.length; i++) {
      const row = suiteRows[i]!;
      const index = i + 1;
      appendSuiteEvent(
        artifactDir,
        { v: 1, event: "row.start", index, total, id: row.id },
        onEvent,
      );

      let result: SuiteRowResult;
      if (row.stub || !row.run) {
        result = {
          id: row.id,
          ok: false,
          status: "stub",
          steps: ["stub"],
          failureKind: "stub",
          error: row.stub ? "stub — journey not executed" : "no runner for row",
        };
      } else if (!device) {
        result = {
          id: row.id,
          ok: false,
          status: "infra",
          steps: [],
          error: runError ?? "android device session missing",
          failureKind: "infra",
        };
      } else {
        const unbindActs = bindMatrixActStream({
          device,
          artifactDir,
          index,
          total,
          id: row.id,
          onEvent,
          enabled: matrixActsEnabled(options.streamActs),
        });
        try {
          result = await row.run(device);
        } catch (error) {
          const required = rows.find((candidate) => candidate.id === row.id)!;
          result = failedJourney(required, error);
        } finally {
          unbindActs();
        }
        fs.writeFileSync(
          path.join(artifactDir, `${row.id}.android.trace.json`),
          JSON.stringify({ result, trace: device.takeTrace() }, null, 2),
        );
      }

      results.push(result);
      fs.writeFileSync(
        path.join(artifactDir, `${result.id}.result.json`),
        JSON.stringify(result, null, 2),
      );
      appendSuiteEvent(
        artifactDir,
        {
          v: 1,
          event: "row.end",
          index,
          total,
          id: result.id,
          status: result.status,
          ok: result.ok,
          error: result.error,
        },
        onEvent,
      );

      const hardFail =
        !result.ok &&
        result.status !== "stub" &&
        result.status !== "os-limit";
      if (failFast && hardFail) {
        aborted = true;
        for (let j = i + 1; j < suiteRows.length; j++) {
          const rest = suiteRows[j]!;
          const skipIndex = j + 1;
          appendSuiteEvent(
            artifactDir,
            {
              v: 1,
              event: "row.start",
              index: skipIndex,
              total,
              id: rest.id,
            },
            onEvent,
          );
          const skipped: SuiteRowResult = {
            id: rest.id,
            ok: false,
            status: "stub",
            steps: ["stub"],
            failureKind: "stub",
            error: "skipped after fail-fast abort",
          };
          results.push(skipped);
          fs.writeFileSync(
            path.join(artifactDir, `${skipped.id}.result.json`),
            JSON.stringify(skipped, null, 2),
          );
          appendSuiteEvent(
            artifactDir,
            {
              v: 1,
              event: "row.end",
              index: skipIndex,
              total,
              id: skipped.id,
              status: skipped.status,
              ok: skipped.ok,
              error: skipped.error,
            },
            onEvent,
          );
        }
        break;
      }

      if (result.status === "infra" && !device) {
        aborted = true;
        for (let j = i + 1; j < suiteRows.length; j++) {
          const rest = suiteRows[j]!;
          const skipIndex = j + 1;
          appendSuiteEvent(
            artifactDir,
            {
              v: 1,
              event: "row.start",
              index: skipIndex,
              total,
              id: rest.id,
            },
            onEvent,
          );
          const skipped: SuiteRowResult = {
            id: rest.id,
            ok: false,
            status: "stub",
            steps: ["stub"],
            failureKind: "stub",
            error: "skipped after device missing",
          };
          results.push(skipped);
          fs.writeFileSync(
            path.join(artifactDir, `${skipped.id}.result.json`),
            JSON.stringify(skipped, null, 2),
          );
          appendSuiteEvent(
            artifactDir,
            {
              v: 1,
              event: "row.end",
              index: skipIndex,
              total,
              id: skipped.id,
              status: skipped.status,
              ok: skipped.ok,
              error: skipped.error,
            },
            onEvent,
          );
        }
        break;
      }
    }
  } finally {
    try {
      await device?.close();
    } catch (error) {
      aborted = true;
      runError = `device cleanup failed: ${String(error)}`;
      appendSuiteEvent(
        artifactDir,
        { v: 1, event: "matrix.cleanup-error", error: runError },
        onEvent,
      );
    }
  }

  const rawClaim = buildClaimState(results);
  fs.writeFileSync(
    path.join(artifactDir, "claim-state.json"),
    JSON.stringify(rawClaim, null, 2),
  );

  const counts: Record<string, number> = {};
  for (const r of results) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }
  appendSuiteEvent(
    artifactDir,
    {
      v: 1,
      event: "matrix.end",
      aborted: aborted || undefined,
      error: runError,
      counts,
      artifactDir,
    },
    onEvent,
  );

  const normalized = normalizeResults(rows, results, "android");
  const claimState = buildClaimState(normalized);
  return {
    results: normalized,
    claimState,
    artifactDir,
    aborted: aborted || undefined,
    runError,
  };
}

function writeMatrixResultJson(
  artifactDir: string,
  payload: {
    artifactDir: string;
    aborted?: boolean;
    runError?: string;
    claimState: ReturnType<typeof buildClaimState>;
    results: TargetJourneyResult[];
  },
): void {
  fs.writeFileSync(
    path.join(artifactDir, "matrix-result.json"),
    JSON.stringify(payload, null, 2),
  );
}

function writeClaimStateJson(
  artifactDir: string,
  claimState: ReturnType<typeof buildClaimState>,
): void {
  fs.writeFileSync(
    path.join(artifactDir, "claim-state.json"),
    JSON.stringify(claimState, null, 2),
  );
}

/**
 * REQUIRED_V2 / REQUIRED_ANDROID matrix — consumer-owned.
 * iOS and Android: repo-owned matrix over one agent-device session.
 * Unknown os-limit (not in claims.ts) fails hard.
 * Android os-limit requires an Android-worded CLAIMS row.
 */
export async function runTargetMatrix(options: RunTargetMatrixOptions = {}) {
  const platform = options.platform ?? "ios";
  const rows = resolveRows(options.ids, platform);
  const blockers = options.stubsOnly
    ? []
    : blockingCapabilities(rows.map((row) => row.id), platform);
  if (blockers.length > 0) {
    throw new AgentDeviceCapabilityError(
      "required-matrix",
      blockers
        .map(
          (entry) =>
            `${entry.primitive} [${entry.affectedRows?.join(", ") ?? "unknown"}]`,
        )
        .join("; "),
    );
  }
  const artifactDir =
    options.artifactDir ??
    path.join(
      repoRoot(),
      "examples/.agent-device/artifacts",
      `targets-${Date.now()}`,
    );
  const forkProvenance = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot(), "examples/.agent-device/fork-provenance.json"),
      "utf8",
    ),
  ) as {
    upstream: { baseCommit: string };
    fork: {
      package: string;
      publishedVersion: string;
      releaseCommit: string;
      releaseUrl: string;
      integrity: string;
    };
    contributions: Array<{ upstreamPullRequest: string }>;
  };
  writeRunManifest({
    artifactDir,
    runner: "agent-device",
    runnerVersion: forkProvenance.fork.publishedVersion,
    platform,
    device: platform === "android" ? options.androidDevice : options.iosDevice,
    runnerProvenance: {
      package: forkProvenance.fork.package,
      version: forkProvenance.fork.publishedVersion,
      releaseCommit: forkProvenance.fork.releaseCommit,
      releaseUrl: forkProvenance.fork.releaseUrl,
      integrity: forkProvenance.fork.integrity,
      upstreamBaseCommit: forkProvenance.upstream.baseCommit,
      upstreamPullRequests: forkProvenance.contributions.map(
        (contribution) => contribution.upstreamPullRequest,
      ),
    },
    releaseBuildManifestPath: options.releaseBuildManifestPath,
  });

  try {
    if (platform === "android") {
      const result = await runAndroidTargetMatrix(rows, options, artifactDir);
      const payload = {
        artifactDir: result.artifactDir,
        aborted: result.aborted,
        runError: result.runError,
        claimState: result.claimState,
        results: result.results,
      };
      writeMatrixResultJson(result.artifactDir, payload);
      writeClaimStateJson(result.artifactDir, result.claimState);
      return result;
    }

    const suiteRows = buildSuiteRows(rows, options, "ios");
    const result = await runMatrix({
      rows: suiteRows,
      iosDevice: options.iosDevice,
      artifactDir,
      failFast: options.failFast !== false,
      idbPath: options.idbPath,
      artifactRoot: repoRoot(),
      onEvent: options.onEvent,
      platform: "ios",
      streamActs: options.streamActs,
    });

    const normalized = normalizeResults(rows, result.results, "ios");
    const claimState = buildClaimState(normalized);
    const out = {
      results: normalized,
      claimState,
      artifactDir: result.artifactDir,
      aborted: result.aborted,
      runError: result.runError,
    };
    writeMatrixResultJson(result.artifactDir, {
      artifactDir: out.artifactDir,
      aborted: out.aborted,
      runError: out.runError,
      claimState: out.claimState,
      results: out.results,
    });
    writeClaimStateJson(result.artifactDir, out.claimState);
    return out;
  } catch (error) {
    fs.writeFileSync(
      path.join(artifactDir, "run-failure.json"),
      JSON.stringify({ error: String(error), at: new Date().toISOString() }, null, 2),
    );
    throw error;
  } finally {
    finishRunManifest(artifactDir);
  }
}
