import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { claimAllowsPlatform } from "./claims";
import { missingGreenOracles } from "./acceptance-oracles";
import {
  MUST_GREEN_ANDROID,
  MUST_REMAIN_GREEN_ANDROID,
  REQUIRED_ANDROID,
  REQUIRED_V2,
  type RequiredTargetRow,
} from "./required";
import type { MatrixRunManifest, ReleaseBuildSet } from "./run-manifest";
import type { TargetClaimState, TargetJourneyResult } from "./types";

type Platform = "ios" | "android";
type ArtifactManifest = MatrixRunManifest & { releaseBuilds?: ReleaseBuildSet };

type MatrixArtifact = {
  directory: string;
  manifest: ArtifactManifest;
  results: TargetJourneyResult[];
  claimState?: TargetClaimState;
  aborted?: boolean;
};

type ArtifactEvent = {
  event?: unknown;
  id?: unknown;
  action?: unknown;
  status?: unknown;
  total?: unknown;
  detail?: unknown;
  at?: unknown;
  [key: string]: unknown;
};

export type CutoverAcceptanceInput = {
  agentDevice: {
    ios: readonly [string, string];
    android: readonly [string, string];
  };
  expectedGitSha?: string;
};

export type CutoverAcceptanceReport = {
  ok: boolean;
  errors: string[];
  pairs: {
    ios: 2;
    android: 2;
  };
  rows: {
    ios: number;
    android: number;
  };
  gitSha: string | null;
};

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function artifactDirectory(input: string): string {
  const resolved = path.resolve(input);
  return fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
}

function loadArtifact(input: string): MatrixArtifact {
  const directory = artifactDirectory(input);
  const matrix = readJson<{
    aborted?: boolean;
    results?: TargetJourneyResult[];
    claimState?: TargetClaimState;
  }>(path.join(directory, "matrix-result.json"));
  return {
    directory,
    manifest: readJson<ArtifactManifest>(path.join(directory, "run-manifest.json")),
    results: matrix.results ?? [],
    claimState: matrix.claimState,
    aborted: matrix.aborted,
  };
}

function currentGitSha(): string | undefined {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function expectedRows(platform: Platform): readonly RequiredTargetRow[] {
  return platform === "android" ? REQUIRED_ANDROID : REQUIRED_V2;
}

function sameMembers(actual: readonly string[], expected: readonly string[]): boolean {
  return (
    actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index])
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function samePoint(
  first: Record<string, unknown> | undefined,
  second: Record<string, unknown> | undefined,
): boolean {
  return (
    typeof first?.x === "number" &&
    Number.isFinite(first.x) &&
    typeof first.y === "number" &&
    Number.isFinite(first.y) &&
    first.x === second?.x &&
    first.y === second?.y
  );
}

function isWithinDirectory(file: string, directory: string): boolean {
  const relative = path.relative(directory, file);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

function hasBehavioralAssertion(result: TargetJourneyResult): boolean {
  return (
    (result.checklist?.length ?? 0) > 0 ||
    result.steps.some((step) =>
      /assert|proof|ok|visible|payload|marker|surface|insert|ready|confirmed|complete/i.test(
        step,
      ),
    )
  );
}

function readEvents(eventsPath: string, label: string, errors: string[]): ArtifactEvent[] {
  if (!fs.existsSync(eventsPath)) {
    errors.push(`${label}: events.jsonl is missing`);
    return [];
  }
  const source = fs.readFileSync(eventsPath, "utf8").trim();
  if (!source) {
    errors.push(`${label}: events.jsonl is empty`);
    return [];
  }
  const events: ArtifactEvent[] = [];
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    try {
      const event = asRecord(JSON.parse(line));
      if (!event) throw new Error("event is not an object");
      events.push(event as ArtifactEvent);
    } catch (error) {
      errors.push(
        `${label}: events.jsonl line ${index + 1} is invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return events;
}

function validateEvents(
  artifact: MatrixArtifact,
  rows: readonly RequiredTargetRow[],
  errors: string[],
): void {
  const label = artifact.directory;
  const events = readEvents(path.join(label, "events.jsonl"), label, errors);
  if (events.length === 0) return;
  if (events[0]?.event !== "matrix.start") {
    errors.push(`${label}: first event must be matrix.start`);
  }
  if (events.at(-1)?.event !== "matrix.end") {
    errors.push(`${label}: last event must be matrix.end`);
  }
  if (events[0]?.total !== rows.length) {
    errors.push(`${label}: matrix.start total must equal ${rows.length}`);
  }

  let previousRowEnd = 0;
  const results = new Map(artifact.results.map((result) => [result.id, result]));
  const rowBounds = new Map<string, { start: number; end: number }>();
  const expectedIds = new Set(rows.map((row) => row.id));
  for (const event of events) {
    if (
      (event.event === "row.start" || event.event === "row.end") &&
      (typeof event.id !== "string" || !expectedIds.has(event.id))
    ) {
      errors.push(`${label}: ${String(event.event)} references unknown row ${String(event.id)}`);
    }
  }
  for (const row of rows) {
    const starts = events
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => event.event === "row.start" && event.id === row.id);
    const ends = events
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => event.event === "row.end" && event.id === row.id);
    if (starts.length !== 1 || ends.length !== 1) {
      errors.push(
        `${label}: ${row.id} must have exactly one row.start and one row.end event`,
      );
      continue;
    }
    const start = starts[0]!;
    const end = ends[0]!;
    if (start.index >= end.index) {
      errors.push(`${label}: ${row.id} row.end occurs before row.start`);
    }
    if (start.index < previousRowEnd) {
      errors.push(`${label}: ${row.id} event range overlaps or is out of registry order`);
    }
    previousRowEnd = end.index;
    rowBounds.set(row.id, { start: start.index, end: end.index });
    const result = results.get(row.id);
    if (result && end.event.status !== result.status) {
      errors.push(`${label}: ${row.id} row.end status disagrees with matrix result`);
    }
  }

  for (const [index, event] of events.entries()) {
    if (event.event !== "row.act" || event.action !== "point-evidence") continue;
    const id = typeof event.id === "string" ? event.id : "<missing-row>";
    const bounds = rowBounds.get(id);
    if (!bounds || index <= bounds.start || index >= bounds.end) {
      errors.push(`${label}: ${id} point-evidence is outside its row event range`);
    }
    const detail = asRecord(event.detail);
    const point = asRecord(detail?.point);
    const descriptor = asRecord(detail?.descriptor);
    const screenshot = detail?.screenshot;
    if (!point || !samePoint(point, point)) {
      errors.push(`${label}: ${id} point-evidence has invalid coordinates`);
    }
    if (!descriptor || Object.keys(descriptor).length === 0) {
      errors.push(`${label}: ${id} point-evidence has no descriptor`);
    }
    if (typeof screenshot !== "string" || screenshot.length === 0) {
      errors.push(`${label}: ${id} point-evidence has no screenshot path`);
    } else {
      const screenshotPath = path.isAbsolute(screenshot)
        ? screenshot
        : path.resolve(label, screenshot);
      if (!isWithinDirectory(screenshotPath, label)) {
        errors.push(`${label}: ${id} point-evidence screenshot is outside the artifact directory`);
      } else if (!fs.existsSync(screenshotPath)) {
        errors.push(`${label}: ${id} point-evidence screenshot is missing`);
      }
    }
    const nextAct = events
      .slice(index + 1)
      .find(
        (candidate) =>
          candidate.id === event.id &&
          (candidate.event === "row.act" || candidate.event === "row.end"),
      );
    if (
      nextAct?.event !== "row.act" ||
      nextAct.action !== "press" ||
      !samePoint(point, asRecord(nextAct.detail))
    ) {
      errors.push(`${label}: ${id} point-evidence is not followed by a matching press`);
    }
    const result = results.get(id);
    if (!result || result.status !== "green" || !result.ok || !hasBehavioralAssertion(result)) {
      errors.push(`${label}: ${id} point-probed action has no green behavioral assertion`);
    }
  }
}

function validateBuildSet(
  artifact: MatrixArtifact,
  platform: Platform,
  rows: readonly RequiredTargetRow[],
  errors: string[],
): void {
  const label = artifact.directory;
  const builds = artifact.manifest.releaseBuilds;
  if (!builds) {
    errors.push(`${label}: missing releaseBuilds proof`);
    return;
  }
  if (builds.platform !== platform) {
    errors.push(`${label}: releaseBuilds platform is ${builds.platform}, expected ${platform}`);
  }
  if (builds.gitSha !== artifact.manifest.gitSha) {
    errors.push(`${label}: releaseBuilds gitSha does not match run gitSha`);
  }
  if (builds.workingTreeDirty !== false) {
    errors.push(`${label}: releaseBuilds must prove a clean working tree`);
  }
  if (!/^[0-9a-f]{64}$/i.test(builds.manifestSha256)) {
    errors.push(`${label}: releaseBuilds manifestSha256 is invalid`);
  }
  const ids = builds.builds.map((build) => build.id);
  const wanted = rows.map((row) => row.id);
  if (!sameMembers(ids, wanted)) {
    errors.push(`${label}: Release build inventory does not exactly cover ${wanted.length} ${platform} rows`);
  }
  for (const build of builds.builds) {
    if (!/^[0-9a-f]{64}$/i.test(build.sha256)) {
      errors.push(`${label}: Release binary digest for ${build.id} is invalid`);
    }
  }
}

function validateArtifact(
  artifact: MatrixArtifact,
  platform: Platform,
  expectedSha: string | undefined,
  errors: string[],
): void {
  const label = artifact.directory;
  const rows = expectedRows(platform);
  if (artifact.manifest.schemaVersion !== 1) {
    errors.push(`${label}: unsupported run-manifest schema`);
  }
  if (artifact.manifest.runner !== "agent-device") {
    errors.push(`${label}: runner is ${artifact.manifest.runner}, expected agent-device`);
  }
  if (artifact.manifest.platform !== platform) {
    errors.push(`${label}: platform is ${artifact.manifest.platform}, expected ${platform}`);
  }
  if (!artifact.manifest.gitSha || artifact.manifest.gitSha !== expectedSha) {
    errors.push(`${label}: gitSha must equal acceptance SHA ${expectedSha ?? "<unknown>"}`);
  }
  if (artifact.manifest.workingTreeDirty !== false) {
    errors.push(`${label}: run must prove a clean working tree`);
  }
  if (!artifact.manifest.device || !artifact.manifest.osVersion) {
    errors.push(`${label}: device and osVersion are required`);
  }
  if (!artifact.manifest.finishedAt) {
    errors.push(`${label}: run is incomplete (finishedAt missing)`);
  }
  if (!artifact.manifest.runnerVersion) {
    errors.push(`${label}: runnerVersion is missing`);
  }
  if (artifact.aborted) {
    errors.push(`${label}: matrix was aborted`);
  }
  const provenance = artifact.manifest.runnerProvenance;
  if (!provenance) {
    errors.push(`${label}: agent-device fork/upstream provenance is missing`);
  } else if (
    !provenance.package ||
    !provenance.version ||
    !/^[0-9a-f]{40}$/i.test(provenance.releaseCommit) ||
    !provenance.releaseUrl ||
    !provenance.integrity ||
    !/^[0-9a-f]{40}$/i.test(provenance.upstreamBaseCommit) ||
    provenance.upstreamPullRequests.length === 0
  ) {
    errors.push(`${label}: agent-device fork/upstream provenance is incomplete`);
  } else if (artifact.manifest.runnerVersion !== provenance.version) {
    errors.push(`${label}: runnerVersion does not match fork provenance version`);
  }

  const ids = artifact.results.map((result) => result.id);
  const wanted = rows.map((row) => row.id);
  if (!sameMembers(ids, wanted)) {
    errors.push(`${label}: results do not exactly cover ${wanted.length} ${platform} rows`);
  }
  if (new Set(ids).size !== ids.length) {
    errors.push(`${label}: duplicate result ids`);
  }
  const claimStatePath = path.join(label, "claim-state.json");
  if (!artifact.claimState || !fs.existsSync(claimStatePath)) {
    errors.push(`${label}: claim-state proof is missing`);
  } else {
    const claimStateFile = readJson<TargetClaimState>(claimStatePath);
    if (JSON.stringify(claimStateFile) !== JSON.stringify(artifact.claimState)) {
      errors.push(`${label}: matrix-result and claim-state.json disagree`);
    }
    const claimStatuses = new Map(
      artifact.claimState.rows.map((row) => [row.id, row.status]),
    );
    for (const result of artifact.results) {
      if (claimStatuses.get(result.id) !== result.status) {
        errors.push(`${label}: claim-state status disagrees for ${result.id}`);
      }
    }
  }
  validateEvents(artifact, rows, errors);
  for (const result of artifact.results) {
    const expected = rows.find((row) => row.id === result.id);
    if (expected && (result.path !== expected.path || result.phase !== expected.phase)) {
      errors.push(`${label}: ${result.id} path/phase metadata does not match the registry`);
    }
    const rowResultPath = path.join(label, `${result.id}.result.json`);
    if (!fs.existsSync(rowResultPath)) {
      errors.push(`${label}: ${result.id}.result.json is missing`);
    } else {
      const rowResult = readJson<TargetJourneyResult>(rowResultPath);
      if (rowResult.status !== result.status || rowResult.id !== result.id) {
        errors.push(`${label}: ${result.id}.result.json disagrees with matrix-result.json`);
      }
    }
    if (result.status !== "green" && result.status !== "os-limit") {
      errors.push(`${label}: ${result.id} ended ${result.status}`);
      continue;
    }
    if (result.status === "green" && (!result.ok || result.steps.length === 0)) {
      errors.push(`${label}: ${result.id} has an invalid or evidence-free green`);
    }
    if (
      result.status === "green" &&
      result.steps.every((step) => /^(launch-host|hyphen-ok|pm-path|dumpsys)/i.test(step))
    ) {
      errors.push(`${label}: ${result.id} is a soft-green`);
    }
    if (result.status === "os-limit") {
      if (!claimAllowsPlatform(result.id, platform)) {
        errors.push(`${label}: ${result.id} has an unapproved ${platform} os-limit`);
      }
      if (result.steps.length === 0) {
        errors.push(`${label}: ${result.id} has an evidence-free os-limit`);
      }
      if (
        result.steps.every((step) => /^(launch-host|hyphen-ok|pm-path|dumpsys)/i.test(step))
      ) {
        errors.push(`${label}: ${result.id} has no honest Locked P attempt`);
      }
    }
    if (result.phase === 1 && result.status === "green") {
      const checklist = new Set(result.checklist ?? []);
      for (const item of [
        "c1-1-trigger-from-host",
        "c1-2-find-extension-row",
        "c1-3-complete-appex",
        "c1-4-assert-host-marker",
      ]) {
        if (!checklist.has(item)) {
          errors.push(`${label}: ${result.id} is missing required C1 oracle ${item}`);
        }
      }
    }
    if (result.status === "green") {
      for (const oracle of missingGreenOracles(platform, result.id, result.steps)) {
        errors.push(`${label}: ${result.id} is missing required green oracle ${oracle}`);
      }
    }
  }
  if (platform === "android") {
    for (const id of [...MUST_GREEN_ANDROID, ...MUST_REMAIN_GREEN_ANDROID]) {
      if (artifact.results.find((result) => result.id === id)?.status !== "green") {
        errors.push(`${label}: Android required-green row ${id} is not green`);
      }
    }
  }
  validateBuildSet(artifact, platform, rows, errors);
}

function buildMap(builds: ReleaseBuildSet | undefined): Map<string, string> {
  return new Map(builds?.builds.map((build) => [build.id, build.sha256]) ?? []);
}

function compareIdentity(
  artifacts: readonly MatrixArtifact[],
  platform: Platform,
  errors: string[],
): void {
  const [first, ...rest] = artifacts;
  if (!first) return;
  const baselineBuilds = buildMap(first.manifest.releaseBuilds);
  for (const artifact of rest) {
    for (const field of ["gitSha", "device", "osVersion"] as const) {
      if (artifact.manifest[field] !== first.manifest[field]) {
        errors.push(
          `${platform}: ${field} differs between ${first.directory} and ${artifact.directory}`,
        );
      }
    }
    const builds = buildMap(artifact.manifest.releaseBuilds);
    for (const [id, sha256] of baselineBuilds) {
      if (builds.get(id) !== sha256) {
        errors.push(`${platform}: Release binary for ${id} differs across paired runs`);
      }
    }
  }
}

function compareRunnerIdentity(
  runs: readonly [MatrixArtifact, MatrixArtifact],
  platform: Platform,
  errors: string[],
): void {
  const [first, second] = runs;
  if (first.manifest.runnerVersion !== second.manifest.runnerVersion) {
    errors.push(`${platform}: agent-device version changed across consecutive runs`);
  }
  for (const field of ["releaseCommit", "integrity"] as const) {
    if (
      first.manifest.runnerProvenance?.[field] !==
      second.manifest.runnerProvenance?.[field]
    ) {
      errors.push(`${platform}: agent-device ${field} changed across consecutive runs`);
    }
  }
}

function resultMap(artifact: MatrixArtifact): Map<string, TargetJourneyResult> {
  return new Map(artifact.results.map((result) => [result.id, result]));
}

function compareConsecutiveRuns(
  runs: readonly [MatrixArtifact, MatrixArtifact],
  platform: Platform,
  errors: string[],
): void {
  const first = resultMap(runs[0]);
  const second = resultMap(runs[1]);
  for (const row of expectedRows(platform)) {
    const a = first.get(row.id);
    const b = second.get(row.id);
    if (a && b && a.status !== b.status) {
      errors.push(`${platform}: ${row.id} changed status across consecutive agent-device runs`);
    }
  }
}

export function verifyCutoverAcceptance(
  input: CutoverAcceptanceInput,
): CutoverAcceptanceReport {
  const errors: string[] = [];
  const expectedSha = input.expectedGitSha ?? currentGitSha();
  const loaded = {
    agentDevice: {
      ios: input.agentDevice.ios.map(loadArtifact) as [MatrixArtifact, MatrixArtifact],
      android: input.agentDevice.android.map(loadArtifact) as [MatrixArtifact, MatrixArtifact],
    },
  };

  for (const platform of ["ios", "android"] as const) {
    for (const artifact of loaded.agentDevice[platform]) {
      validateArtifact(artifact, platform, expectedSha, errors);
    }
    compareIdentity(loaded.agentDevice[platform], platform, errors);
    compareRunnerIdentity(loaded.agentDevice[platform], platform, errors);
    compareConsecutiveRuns(loaded.agentDevice[platform], platform, errors);
  }

  return {
    ok: errors.length === 0,
    errors,
    pairs: { ios: 2, android: 2 },
    rows: { ios: REQUIRED_V2.length, android: REQUIRED_ANDROID.length },
    gitSha: expectedSha ?? null,
  };
}
