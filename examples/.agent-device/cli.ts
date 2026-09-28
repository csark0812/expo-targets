#!/usr/bin/env bun
import process from "node:process";
import {
  createMatrixReporter,
  formatMatrixSummary,
} from "./suite";
import { formatDryPreflight, runDryPreflight } from "./dry-preflight";
import { runTargetMatrix } from "./matrix";
import { verifyCutoverAcceptance } from "./acceptance";
import { writeReleaseBuildManifest } from "./release-builds";
import {
  MUST_GREEN_ANDROID,
  MUST_REMAIN_GREEN_ANDROID,
  REQUIRED_ANDROID,
  REQUIRED_V2,
  type TargetPhase,
} from "./required";

function usage(): never {
  console.error(`examples/.agent-device/cli.ts <command>

Commands:
  dry-preflight [--no-sim] [--android]
  matrix [--ids=a,b] [--stubs-only] [--live-through=1|2|3|4|5] [--no-fail-fast] [--ensure-install]
         [--platform=ios|android] [--device=<udid-or-serial>] [--release-manifest=<path>]
         [--json] [--must=a,b] [--no-acts]
  acceptance --ios=<agent-run-1>,<agent-run-2> --android=<agent-run-1>,<agent-run-2>
             [--sha=<git-sha>] [--json]
  release-builds --platform=ios|android --device=<udid-or-serial> --out=<path>

  --ensure-install  Release-build + install missing hosts before live journeys
                    (iOS only today; slow on first run). Skips when already installed.
  --platform=android  Drive REQUIRED_ANDROID closed set on an adb device
                      (skips Apple-only ids; default device emulator-5554 via npm script).
  --device=            iOS sim UDID or Android serial (default: env / soft-omit).
  --release-manifest=  JSON digest inventory for the exact installed Release binaries.
  --json               Print machine JSON on stdout (default: human summary).
  --must=a,b           MUST ids for summary (android default: MUST_GREEN ∪ MUST_REMAIN).
  --no-acts            Disable live TraceStep act events in events.jsonl (default: on).

  Artifacts (always): artifactDir/events.jsonl, matrix-result.json, claim-state.json
  Progress: stderr when TTY (spinner + acts). Agents: tail -f artifactDir/events.jsonl
            (not stderr). Do not redirect human stdout as JSON.

Env:
  AGENT_DEVICE_UDID / AGENT_DEVICE_SIM_UDID
  AGENT_DEVICE_MATRIX_ACTS=0|off|false  same as --no-acts
`);
  process.exit(2);
}

function requiredPair(rest: string[], name: string): [string, string] {
  const value = rest.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const entries = value?.split(",").filter(Boolean) ?? [];
  if (entries.length !== 2) {
    throw new Error(`--${name} requires exactly two comma-separated artifact paths`);
  }
  return [entries[0]!, entries[1]!];
}

function cmdAcceptance(rest: string[]): void {
  const sha = rest.find((arg) => arg.startsWith("--sha="))?.slice("--sha=".length);
  const report = verifyCutoverAcceptance({
    agentDevice: {
      ios: requiredPair(rest, "ios"),
      android: requiredPair(rest, "android"),
    },
    expectedGitSha: sha,
  });
  if (rest.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    console.log(
      `agent-device cutover acceptance passed: ${report.pairs.ios} iOS pairs (${report.rows.ios} rows) + ${report.pairs.android} Android pairs (${report.rows.android} rows) at ${report.gitSha}`,
    );
  } else {
    console.error("agent-device cutover acceptance failed:\n");
    for (const error of report.errors) console.error(`- ${error}`);
  }
  process.exit(report.ok ? 0 : 1);
}

function requiredValue(rest: string[], name: string): string {
  const value = rest.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

function cmdReleaseBuilds(rest: string[]): void {
  const platform = requiredValue(rest, "platform");
  if (platform !== "ios" && platform !== "android") {
    throw new Error("--platform must be ios or android");
  }
  const output = requiredValue(rest, "out");
  writeReleaseBuildManifest({
    platform,
    device: requiredValue(rest, "device"),
    output,
  });
  console.log(output);
}

async function cmdDry(rest: string[]): Promise<void> {
  const report = await runDryPreflight({
    allowNoSim: rest.includes("--no-sim"),
    requireAndroid: rest.includes("--android"),
  });
  console.log(formatDryPreflight(report));
  process.exit(report.ok ? 0 : 1);
}

function resolveMustIds(
  rest: string[],
  platform: "ios" | "android" | undefined,
): string[] | undefined {
  const mustArg = rest.find((a) => a.startsWith("--must="));
  if (mustArg) {
    return mustArg.slice("--must=".length).split(",").filter(Boolean);
  }
  if (platform === "android") {
    return [...MUST_GREEN_ANDROID, ...MUST_REMAIN_GREEN_ANDROID];
  }
  return undefined;
}

async function cmdMatrix(rest: string[]): Promise<void> {
  const idsArg = rest.find((a) => a.startsWith("--ids="));
  const ids = idsArg
    ? idsArg.slice("--ids=".length).split(",").filter(Boolean)
    : undefined;
  const liveArg = rest.find((a) => a.startsWith("--live-through="));
  const liveThroughPhase = liveArg
    ? (Number(liveArg.slice("--live-through=".length)) as TargetPhase)
    : undefined;
  const platformArg = rest.find((a) => a.startsWith("--platform="));
  const platformRaw = platformArg?.slice("--platform=".length);
  const platform =
    platformRaw === "android" || platformRaw === "ios"
      ? platformRaw
      : undefined;
  const deviceArg = rest.find((a) => a.startsWith("--device="));
  const device =
    deviceArg?.slice("--device=".length) ||
    process.env.AGENT_DEVICE_UDID ||
    process.env.AGENT_DEVICE_SIM_UDID ||
    undefined;
  const wantJson = rest.includes("--json");
  const mustIds = resolveMustIds(rest, platform);
  const releaseManifestArg = rest.find((a) =>
    a.startsWith("--release-manifest="),
  );
  const releaseBuildManifestPath = releaseManifestArg?.slice(
    "--release-manifest=".length,
  );

  const reporter = wantJson
    ? undefined
    : createMatrixReporter();

  const result = await runTargetMatrix({
    ids,
    stubsOnly: rest.includes("--stubs-only"),
    liveThroughPhase,
    failFast: !rest.includes("--no-fail-fast"),
    ensureInstall: rest.includes("--ensure-install"),
    platform,
    iosDevice: platform === "android" ? undefined : device,
    androidDevice: platform === "android" ? device : undefined,
    onEvent: reporter?.onEvent,
    streamActs: rest.includes("--no-acts") ? false : undefined,
    releaseBuildManifestPath,
  });

  const payload = {
    artifactDir: result.artifactDir,
    aborted: result.aborted,
    claimState: result.claimState,
    results: result.results,
  };

  if (wantJson) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(
      formatMatrixSummary(
        {
          results: result.results,
          artifactDir: result.artifactDir,
          aborted: result.aborted,
          claimState: result.claimState,
        },
        { mustIds },
      ),
    );
  }

  const hardRed = result.results.some(
    (r) => !r.ok && r.status !== "stub" && r.status !== "os-limit",
  );
  process.exit(hardRed || result.aborted ? 1 : 0);
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help") usage();
  if (cmd === "dry-preflight") return cmdDry(rest);
  if (cmd === "matrix") return cmdMatrix(rest);
  if (cmd === "acceptance") return cmdAcceptance(rest);
  if (cmd === "release-builds") return cmdReleaseBuilds(rest);
  if (cmd === "list") {
    const platformArg = rest.find((a) => a.startsWith("--platform="));
    const platform = platformArg?.slice("--platform=".length);
    const rows = platform === "android" ? REQUIRED_ANDROID : REQUIRED_V2;
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  usage();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
