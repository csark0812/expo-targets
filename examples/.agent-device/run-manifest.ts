import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type MatrixRunner = "agent-device";

export type MatrixRunManifest = {
  schemaVersion: 1;
  runner: MatrixRunner;
  runnerVersion: string;
  gitSha: string | null;
  workingTreeDirty: boolean | null;
  platform: "ios" | "android";
  device: string | null;
  osVersion: string | null;
  startedAt: string;
  finishedAt?: string;
  releaseBuilds?: ReleaseBuildSet;
  runnerProvenance?: {
    package: string;
    version: string;
    releaseCommit: string;
    releaseUrl: string;
    integrity: string;
    upstreamBaseCommit: string;
    upstreamPullRequests: string[];
  };
};

export type ReleaseBuildSet = {
  schemaVersion: 1;
  platform: "ios" | "android";
  gitSha: string;
  workingTreeDirty: false;
  manifestSha256: string;
  builds: Array<{
    id: string;
    sha256: string;
  }>;
};

type ReleaseBuildManifestFile = Omit<ReleaseBuildSet, "manifestSha256">;

function loadReleaseBuildSet(
  manifestPath: string,
  platform: "ios" | "android",
): ReleaseBuildSet {
  const bytes = fs.readFileSync(manifestPath);
  const parsed = JSON.parse(bytes.toString("utf8")) as ReleaseBuildManifestFile;
  if (parsed.schemaVersion !== 1) {
    throw new Error(`release-build manifest must use schemaVersion 1: ${manifestPath}`);
  }
  if (parsed.platform !== platform) {
    throw new Error(
      `release-build manifest platform ${parsed.platform} does not match ${platform}`,
    );
  }
  if (!/^[0-9a-f]{40}$/i.test(parsed.gitSha)) {
    throw new Error("release-build manifest gitSha must be a 40-character commit SHA");
  }
  if (parsed.workingTreeDirty !== false) {
    throw new Error("release-build manifest must prove a clean working tree");
  }
  if (!Array.isArray(parsed.builds) || parsed.builds.length === 0) {
    throw new Error("release-build manifest must contain at least one build");
  }
  const ids = new Set<string>();
  for (const build of parsed.builds) {
    if (!build?.id || ids.has(build.id)) {
      throw new Error(`release-build manifest has a missing or duplicate id: ${build?.id ?? ""}`);
    }
    if (!/^[0-9a-f]{64}$/i.test(build.sha256)) {
      throw new Error(`release-build manifest has an invalid sha256 for ${build.id}`);
    }
    ids.add(build.id);
  }
  return {
    ...parsed,
    manifestSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function commandOutput(command: string, args: string[]): string | undefined {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function resolveDeviceIdentity(
  platform: "ios" | "android",
  requested: string | undefined,
): string | undefined {
  if (requested) return requested;
  if (platform === "android") {
    return commandOutput("adb", ["devices"])
      ?.split("\n")
      .slice(1)
      .map((line) => line.trim().split(/\s+/))
      .find(([, state]) => state === "device")?.[0];
  }
  const list = commandOutput("xcrun", [
    "simctl",
    "list",
    "devices",
    "booted",
    "--json",
  ]);
  if (!list) return undefined;
  try {
    const parsed = JSON.parse(list) as {
      devices?: Record<string, Array<{ udid: string; state?: string }>>;
    };
    return Object.values(parsed.devices ?? {})
      .flat()
      .find((candidate) => candidate.state === "Booted")?.udid;
  } catch {
    return undefined;
  }
}

function deviceOs(
  platform: "ios" | "android",
  device: string | undefined,
): string | undefined {
  if (!device) return undefined;
  if (platform === "android") {
    const release = commandOutput("adb", [
      "-s",
      device,
      "shell",
      "getprop",
      "ro.build.version.release",
    ]);
    const api = commandOutput("adb", [
      "-s",
      device,
      "shell",
      "getprop",
      "ro.build.version.sdk",
    ]);
    return release ? `Android ${release}${api ? ` (API ${api})` : ""}` : undefined;
  }
  const list = commandOutput("xcrun", ["simctl", "list", "devices", "--json"]);
  if (!list) return undefined;
  try {
    const parsed = JSON.parse(list) as {
      devices?: Record<string, Array<{ udid: string }>>;
    };
    return Object.entries(parsed.devices ?? {}).find(([, devices]) =>
      devices.some((candidate) => candidate.udid === device),
    )?.[0];
  } catch {
    return undefined;
  }
}

export function writeRunManifest(options: {
  artifactDir: string;
  runner: MatrixRunner;
  runnerVersion: string;
  platform: "ios" | "android";
  device?: string;
  runnerProvenance?: MatrixRunManifest["runnerProvenance"];
  releaseBuildManifestPath?: string;
}): void {
  const resolvedDevice = resolveDeviceIdentity(options.platform, options.device);
  const gitSha = commandOutput("git", ["rev-parse", "HEAD"]) ?? null;
  const status = commandOutput("git", ["status", "--porcelain", "--untracked-files=all"]);
  const releaseBuilds = options.releaseBuildManifestPath
    ? loadReleaseBuildSet(options.releaseBuildManifestPath, options.platform)
    : undefined;
  if (releaseBuilds && releaseBuilds.gitSha !== gitSha) {
    throw new Error(
      `release-build manifest gitSha ${releaseBuilds.gitSha} does not match checkout ${gitSha ?? "<unknown>"}`,
    );
  }
  const manifest: MatrixRunManifest = {
    schemaVersion: 1,
    runner: options.runner,
    runnerVersion: options.runnerVersion,
    gitSha,
    workingTreeDirty: status === undefined ? null : status.length > 0,
    platform: options.platform,
    device: resolvedDevice ?? null,
    osVersion: deviceOs(options.platform, resolvedDevice) ?? null,
    startedAt: new Date().toISOString(),
    ...(releaseBuilds ? { releaseBuilds } : {}),
    ...(options.runnerProvenance
      ? { runnerProvenance: options.runnerProvenance }
      : {}),
  };
  fs.mkdirSync(options.artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(options.artifactDir, "run-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
}

export function finishRunManifest(artifactDir: string): void {
  const manifestPath = path.join(artifactDir, "run-manifest.json");
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  ) as MatrixRunManifest;
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ ...manifest, finishedAt: new Date().toISOString() }, null, 2),
  );
}
