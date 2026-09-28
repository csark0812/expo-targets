import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runTargetMatrix } from "./matrix";
import { runMatrix } from "./suite";
import type { DeviceSession } from "./driver";
import { finishRunManifest, writeRunManifest } from "./run-manifest";

const created: string[] = [];

function fakeDevice(close: () => Promise<void> = async () => undefined): DeviceSession {
  return {
    onTrace: () => () => undefined,
    takeTrace: () => [],
    close,
  } as unknown as DeviceSession;
}

afterEach(() => {
  for (const directory of created.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("agent-device artifact contract", () => {
  test("binds an exact Release build inventory to a run", () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), "expo-targets-agent-device-"));
    created.push(artifactDir);
    const buildManifest = path.join(artifactDir, "release-builds.json");
    const gitSha = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    fs.writeFileSync(
      buildManifest,
      JSON.stringify({
        schemaVersion: 1,
        platform: "ios",
        gitSha,
        workingTreeDirty: false,
        builds: [{ id: "share", sha256: "b".repeat(64) }],
      }),
    );
    writeRunManifest({
      artifactDir,
      runner: "agent-device",
      runnerVersion: "fork-release",
      platform: "ios",
      device: "fixture-device",
      releaseBuildManifestPath: buildManifest,
    });
    const manifest = JSON.parse(
      fs.readFileSync(path.join(artifactDir, "run-manifest.json"), "utf8"),
    ) as { releaseBuilds?: { manifestSha256?: string; builds?: unknown[] } };
    expect(manifest.releaseBuilds?.manifestSha256).toHaveLength(64);
    expect(manifest.releaseBuilds?.builds).toHaveLength(1);
  });

  test("records immutable fork and upstream provenance in the run manifest", () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), "expo-targets-agent-device-"));
    created.push(artifactDir);
    writeRunManifest({
      artifactDir,
      runner: "agent-device",
      runnerVersion: "fork-release",
      platform: "ios",
      device: "fixture-device",
      runnerProvenance: {
        package: "@csark0812/agent-device",
        version: "0.21.15-et.3",
        releaseCommit: "release-commit",
        releaseUrl: "https://github.com/csark0812/agent-device/releases/tag/v0.21.15-et.3",
        integrity: "sha512-fixture",
        upstreamBaseCommit: "upstream-commit",
        upstreamPullRequests: ["https://github.com/callstack/agent-device/pull/2999"],
      },
    });
    finishRunManifest(artifactDir);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(artifactDir, "run-manifest.json"), "utf8"),
    ) as {
      finishedAt?: string;
      runnerProvenance?: { version?: string; upstreamPullRequests?: string[] };
    };
    expect(manifest.finishedAt).toBeString();
    expect(manifest.runnerProvenance).toEqual(
      expect.objectContaining({
        version: "0.21.15-et.3",
        upstreamPullRequests: ["https://github.com/callstack/agent-device/pull/2999"],
      }),
    );
  });

  test("records the installed fork version rather than its tarball URL", async () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), "expo-targets-agent-device-"));
    created.push(artifactDir);
    await runTargetMatrix({ artifactDir, ids: ["share"], stubsOnly: true });
    const manifest = JSON.parse(
      fs.readFileSync(path.join(artifactDir, "run-manifest.json"), "utf8"),
    ) as { runnerVersion?: string; runnerProvenance?: { version?: string } };
    expect(manifest.runnerVersion).toBe("0.21.15-et.3");
    expect(manifest.runnerVersion).toBe(manifest.runnerProvenance?.version);
  });

  test("emits ordered events and isolated stub row results without a device", async () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), "expo-targets-agent-device-"));
    created.push(artifactDir);
    const result = await runMatrix({
      artifactDir,
      rows: [{ id: "alpha", stub: true }, { id: "beta", stub: true }],
    });

    expect(result.results.map((row) => row.id)).toEqual(["alpha", "beta"]);
    expect(fs.existsSync(path.join(artifactDir, "alpha.result.json"))).toBe(true);
    expect(fs.existsSync(path.join(artifactDir, "beta.result.json"))).toBe(true);

    const events = fs
      .readFileSync(path.join(artifactDir, "events.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { event: string; id?: string });
    expect(events.map((event) => `${event.event}:${event.id ?? ""}`)).toEqual([
      "matrix.start:",
      "row.start:alpha",
      "row.end:alpha",
      "row.start:beta",
      "row.end:beta",
      "matrix.end:",
    ]);
  });

  test("writes complete row artifacts after fail-fast abort", async () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), "expo-targets-agent-device-"));
    created.push(artifactDir);
    let secondRan = false;
    const result = await runMatrix({
      artifactDir,
      launchDevice: async () => fakeDevice(),
      rows: [
        {
          id: "alpha",
          run: async () => ({
            id: "alpha",
            ok: false,
            status: "red",
            steps: [],
            error: "fixture failure",
          }),
        },
        {
          id: "beta",
          run: async () => {
            secondRan = true;
            return { id: "beta", ok: true, status: "green", steps: ["proof"] };
          },
        },
      ],
    });

    expect(result.aborted).toBe(true);
    expect(secondRan).toBe(false);
    expect(result.results.map((row) => `${row.id}:${row.status}`)).toEqual([
      "alpha:red",
      "beta:stub",
    ]);
    expect(fs.existsSync(path.join(artifactDir, "beta.result.json"))).toBe(true);
    const events = fs
      .readFileSync(path.join(artifactDir, "events.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { event: string; id?: string });
    expect(events.map((event) => `${event.event}:${event.id ?? ""}`)).toEqual([
      "matrix.start:",
      "row.start:alpha",
      "row.end:alpha",
      "row.start:beta",
      "row.end:beta",
      "matrix.end:",
    ]);
  });

  test("turns device launch failure into complete infra row evidence", async () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), "expo-targets-agent-device-"));
    created.push(artifactDir);
    const result = await runMatrix({
      artifactDir,
      failFast: false,
      launchDevice: async () => {
        throw new Error("fixture device unavailable");
      },
      rows: [
        { id: "alpha", run: async () => ({ id: "alpha", ok: true, status: "green" }) },
        { id: "beta", run: async () => ({ id: "beta", ok: true, status: "green" }) },
      ],
    });

    expect(result.results.map((row) => row.status)).toEqual(["infra", "infra"]);
    expect(result.runError).toContain("device launch failed");
    const events = fs.readFileSync(path.join(artifactDir, "events.jsonl"), "utf8");
    expect(events).toContain('"event":"matrix.device-error"');
    expect(events.trim().endsWith("}")).toBe(true);
    expect(JSON.parse(events.trim().split("\n").at(-1)!).event).toBe("matrix.end");
  });

  test("records cleanup failure and still terminates the event stream", async () => {
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), "expo-targets-agent-device-"));
    created.push(artifactDir);
    const result = await runMatrix({
      artifactDir,
      launchDevice: async () =>
        fakeDevice(async () => {
          throw new Error("fixture cleanup failure");
        }),
      rows: [
        {
          id: "alpha",
          run: async () => ({ id: "alpha", ok: true, status: "green", steps: ["proof"] }),
        },
      ],
    });

    expect(result.aborted).toBe(true);
    expect(result.runError).toContain("device cleanup failed");
    const events = fs
      .readFileSync(path.join(artifactDir, "events.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { event: string });
    expect(events.at(-2)?.event).toBe("matrix.cleanup-error");
    expect(events.at(-1)?.event).toBe("matrix.end");
  });
});
