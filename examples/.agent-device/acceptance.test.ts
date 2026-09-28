import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { verifyCutoverAcceptance } from "./acceptance";
import { greenOracleExamples } from "./acceptance-oracles";
import { REQUIRED_ANDROID, REQUIRED_V2, type RequiredTargetRow } from "./required";
import type { MatrixRunManifest } from "./run-manifest";
import type { TargetJourneyResult } from "./types";

const SHA = "a".repeat(40);
const created: string[] = [];

afterEach(() => {
  for (const directory of created.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function results(
  rows: readonly RequiredTargetRow[],
  platform: "ios" | "android",
): TargetJourneyResult[] {
  return rows.map((row) => ({
    ...row,
    ok: true,
    status: "green",
    steps: [`asserted-visible-${row.id}`, ...greenOracleExamples(platform, row.id)],
    ...(row.phase === 1
      ? {
          checklist: [
            "c1-1-trigger-from-host",
            "c1-2-find-extension-row",
            "c1-3-complete-appex",
            "c1-4-assert-host-marker",
          ],
        }
      : {}),
  }));
}

function writeArtifact(options: {
  platform: "ios" | "android";
  rows: readonly RequiredTargetRow[];
  mutateResults?: (values: TargetJourneyResult[]) => void;
  mutateManifest?: (manifest: Record<string, unknown>) => void;
}): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "expo-targets-acceptance-"));
  created.push(directory);
  const rowResults = results(options.rows, options.platform);
  options.mutateResults?.(rowResults);
  const manifest: Record<string, unknown> = {
    schemaVersion: 1,
    runner: "agent-device",
    runnerVersion: "0.21.15-et.1",
    gitSha: SHA,
    workingTreeDirty: false,
    platform: options.platform,
    device: options.platform === "ios" ? "ios-device" : "android-device",
    osVersion: options.platform === "ios" ? "iOS-26-0" : "Android 16 (API 36)",
    startedAt: "2026-09-27T00:00:00.000Z",
    finishedAt: "2026-09-27T00:10:00.000Z",
    releaseBuilds: {
      schemaVersion: 1,
      platform: options.platform,
      gitSha: SHA,
      workingTreeDirty: false,
      manifestSha256: "b".repeat(64),
      builds: options.rows.map((row) => ({ id: row.id, sha256: "c".repeat(64) })),
    },
    runnerProvenance: {
      package: "@csark0812/agent-device",
      version: "0.21.15-et.1",
      releaseCommit: "d".repeat(40),
      releaseUrl: "https://github.com/csark0812/agent-device/releases/tag/v0.21.15-et.1",
      integrity: "sha512-fixture",
      upstreamBaseCommit: "e".repeat(40),
      upstreamPullRequests: ["https://github.com/callstack/agent-device/pull/2999"],
    },
  } satisfies MatrixRunManifest | Record<string, unknown>;
  options.mutateManifest?.(manifest);
  const surviving = rowResults.filter((result) => result.status === "green").map((result) => result.id);
  const osLimit = rowResults.filter((result) => result.status === "os-limit").map((result) => result.id);
  const claimState = {
    surviving,
    cut: rowResults.filter((result) => result.status === "red").map((result) => result.id),
    stub: rowResults.filter((result) => result.status === "stub").map((result) => result.id),
    osLimit,
    rows: rowResults.map(({ id, path: rowPath, phase, status, error, failureKind }) => ({
      id,
      path: rowPath,
      phase,
      status,
      ...(error ? { error } : {}),
      ...(failureKind ? { failureKind } : {}),
    })),
  };
  fs.writeFileSync(path.join(directory, "run-manifest.json"), JSON.stringify(manifest));
  fs.writeFileSync(
    path.join(directory, "matrix-result.json"),
    JSON.stringify({ aborted: false, results: rowResults, claimState }),
  );
  fs.writeFileSync(path.join(directory, "claim-state.json"), JSON.stringify(claimState));
  const events: Array<Record<string, unknown>> = [
    { v: 1, event: "matrix.start", total: options.rows.length },
  ];
  for (const [index, result] of rowResults.entries()) {
    events.push(
      { v: 1, event: "row.start", index: index + 1, total: options.rows.length, id: result.id },
      {
        v: 1,
        event: "row.end",
        index: index + 1,
        total: options.rows.length,
        id: result.id,
        status: result.status,
        ok: result.ok,
      },
    );
  }
  events.push({ v: 1, event: "matrix.end" });
  fs.writeFileSync(
    path.join(directory, "events.jsonl"),
    `${events
      .map((event, index) =>
        JSON.stringify({ ...event, at: new Date(Date.UTC(2026, 8, 27, 0, 0, index)).toISOString() }),
      )
      .join("\n")}\n`,
  );
  for (const result of rowResults) {
    fs.writeFileSync(path.join(directory, `${result.id}.result.json`), JSON.stringify(result));
  }
  return directory;
}

function completeInput() {
  return {
    agentDevice: {
      ios: [
        writeArtifact({ platform: "ios", rows: REQUIRED_V2 }),
        writeArtifact({ platform: "ios", rows: REQUIRED_V2 }),
      ] as [string, string],
      android: [
        writeArtifact({ platform: "android", rows: REQUIRED_ANDROID }),
        writeArtifact({ platform: "android", rows: REQUIRED_ANDROID }),
      ] as [string, string],
    },
    expectedGitSha: SHA,
  };
}

describe("agent-device cutover acceptance", () => {
  test("accepts two complete same-build runs per platform", () => {
    const report = verifyCutoverAcceptance(completeInput());
    expect(report).toEqual({
      ok: true,
      errors: [],
      pairs: { ios: 2, android: 2 },
      rows: { ios: 55, android: 28 },
      gitSha: SHA,
    });
  });

  test("rejects a non-green row, incomplete matrix, and different binary", () => {
    const input = completeInput();
    const degraded = input.agentDevice.ios[0];
    const matrixPath = path.join(degraded, "matrix-result.json");
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as {
      results: TargetJourneyResult[];
    };
    matrix.results[0] = {
      ...matrix.results[0]!,
      ok: false,
      status: "operator",
      steps: [],
    };
    matrix.results.pop();
    fs.writeFileSync(matrixPath, JSON.stringify(matrix));

    const manifestPath = path.join(input.agentDevice.android[1], "run-manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as MatrixRunManifest;
    manifest.releaseBuilds!.builds[0]!.sha256 = "f".repeat(64);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    const report = verifyCutoverAcceptance(input);
    expect(report.ok).toBe(false);
    expect(report.errors.some((error) => error.includes("ended operator"))).toBe(true);
    expect(report.errors.some((error) => error.includes("exactly cover 55"))).toBe(true);
    expect(report.errors.some((error) => error.includes("Release binary for share differs"))).toBe(true);
  });

  test("rejects run or Release evidence captured from a dirty tree", () => {
    const input = completeInput();
    const runManifestPath = path.join(
      input.agentDevice.ios[0],
      "run-manifest.json",
    );
    const runManifest = JSON.parse(
      fs.readFileSync(runManifestPath, "utf8"),
    ) as MatrixRunManifest;
    runManifest.workingTreeDirty = true;
    fs.writeFileSync(runManifestPath, JSON.stringify(runManifest));

    const buildManifestPath = path.join(
      input.agentDevice.android[0],
      "run-manifest.json",
    );
    const buildManifest = JSON.parse(
      fs.readFileSync(buildManifestPath, "utf8"),
    ) as { releaseBuilds?: { workingTreeDirty?: boolean } };
    buildManifest.releaseBuilds!.workingTreeDirty = true;
    fs.writeFileSync(buildManifestPath, JSON.stringify(buildManifest));

    const report = verifyCutoverAcceptance(input);
    expect(report.ok).toBe(false);
    expect(report.errors.some((error) => error.includes("run must prove a clean working tree"))).toBe(
      true,
    );
    expect(
      report.errors.some((error) =>
        error.includes("releaseBuilds must prove a clean working tree"),
      ),
    ).toBe(true);
  });

  test("rejects a Phase 1 green without the frozen C1 oracle", () => {
    const input = completeInput();
    const artifact = input.agentDevice.ios[0];
    const matrixPath = path.join(artifact, "matrix-result.json");
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as {
      results: TargetJourneyResult[];
    };
    const share = matrix.results.find((result) => result.id === "share")!;
    share.checklist = share.checklist?.filter(
      (item) => item !== "c1-4-assert-host-marker",
    );
    fs.writeFileSync(matrixPath, JSON.stringify(matrix));
    fs.writeFileSync(
      path.join(artifact, "share.result.json"),
      JSON.stringify(share),
    );

    const report = verifyCutoverAcceptance(input);
    expect(report.ok).toBe(false);
    expect(
      report.errors.some((error) =>
        error.includes("share is missing required C1 oracle c1-4-assert-host-marker"),
      ),
    ).toBe(true);
  });

  test("rejects a critical green without its behavioral oracle", () => {
    const input = completeInput();
    const artifact = input.agentDevice.android[0];
    const matrixPath = path.join(artifact, "matrix-result.json");
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as {
      results: TargetJourneyResult[];
    };
    const notificationService = matrix.results.find(
      (result) => result.id === "notification-service",
    )!;
    notificationService.steps = notificationService.steps.filter(
      (step) => step !== "fcm-remote-send:200",
    );
    fs.writeFileSync(matrixPath, JSON.stringify(matrix));
    fs.writeFileSync(
      path.join(artifact, "notification-service.result.json"),
      JSON.stringify(notificationService),
    );

    const report = verifyCutoverAcceptance(input);
    expect(report.ok).toBe(false);
    expect(
      report.errors.some((error) =>
        error.includes("notification-service is missing required green oracle fcm-remote-send:200"),
      ),
    ).toBe(true);
  });

  test("rejects incomplete event ordering and uncorroborated point evidence", () => {
    const input = completeInput();
    const artifact = input.agentDevice.ios[0];
    const screenshot = path.join(artifact, "point.png");
    fs.writeFileSync(screenshot, "fixture");
    const eventsPath = path.join(artifact, "events.jsonl");
    const events = fs
      .readFileSync(eventsPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const shareStart = events.findIndex(
      (event) => event.event === "row.start" && event.id === "share",
    );
    events.splice(shareStart + 1, 0, {
      v: 1,
      event: "row.act",
      id: "share",
      action: "point-evidence",
      detail: {
        point: { x: 10, y: 20 },
        descriptor: { label: "Share" },
        screenshot,
      },
      at: "2026-09-27T00:00:00.000Z",
    });
    events.push(events.shift()!);
    fs.writeFileSync(eventsPath, `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);

    const report = verifyCutoverAcceptance(input);
    expect(report.ok).toBe(false);
    expect(report.errors.some((error) => error.includes("first event must be matrix.start"))).toBe(
      true,
    );
    expect(
      report.errors.some((error) =>
        error.includes("share point-evidence is not followed by a matching press"),
      ),
    ).toBe(true);
  });

  test("accepts point evidence only when the adjacent press and screenshot corroborate it", () => {
    const input = completeInput();
    const artifact = input.agentDevice.ios[0];
    const screenshot = path.join(artifact, "point.png");
    fs.writeFileSync(screenshot, "fixture");
    const eventsPath = path.join(artifact, "events.jsonl");
    const events = fs
      .readFileSync(eventsPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const shareEnd = events.findIndex(
      (event) => event.event === "row.end" && event.id === "share",
    );
    events.splice(
      shareEnd,
      0,
      {
        v: 1,
        event: "row.act",
        id: "share",
        action: "point-evidence",
        detail: {
          point: { x: 10, y: 20 },
          descriptor: { label: "Share" },
          screenshot,
        },
        at: "2026-09-27T00:00:00.000Z",
      },
      {
        v: 1,
        event: "row.act",
        id: "share",
        action: "press",
        detail: { x: 10, y: 20 },
        at: "2026-09-27T00:00:00.000Z",
      },
    );
    fs.writeFileSync(eventsPath, `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);

    expect(verifyCutoverAcceptance(input).ok).toBe(true);
  });
});
