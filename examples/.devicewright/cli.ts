#!/usr/bin/env bun
import process from "node:process";
import { formatDryPreflight, runDryPreflight } from "./dry-preflight";
import { runTargetMatrix } from "./matrix";
import { REQUIRED_V2, type TargetPhase } from "./required";

function usage(): never {
  console.error(`examples/.devicewright/cli.ts <command>

Commands:
  dry-preflight [--no-sim] [--android]
  matrix [--ids=a,b] [--stubs-only] [--live-through=1|2|3|4|5] [--no-fail-fast] [--ensure-install]
         [--platform=ios|android] [--device=<udid-or-serial>]
  list

  --ensure-install  Release-build + install missing hosts before live journeys
                    (iOS only today; slow on first run). Skips when already installed.
  --platform=android  Drive journeys on an adb device (share Android dual).
  --device=            iOS sim UDID or Android serial (default: env / soft-omit).

Env:
  DEVICEWRIGHT_IDB_PATH / IOS_SIMULATOR_MCP_IDB_PATH
  DEVICEWRIGHT_UDID / DEVICEWRIGHT_SIM_UDID
  NODE_AUTH_TOKEN (private @csark0812/devicewright install)
`);
  process.exit(2);
}

function cmdDry(rest: string[]): void {
  const report = runDryPreflight({
    allowNoSim: rest.includes("--no-sim"),
    requireAndroid: rest.includes("--android"),
  });
  console.log(formatDryPreflight(report));
  process.exit(report.ok ? 0 : 1);
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
    process.env.DEVICEWRIGHT_UDID ||
    process.env.DEVICEWRIGHT_SIM_UDID ||
    undefined;
  const result = await runTargetMatrix({
    ids,
    stubsOnly: rest.includes("--stubs-only"),
    liveThroughPhase,
    failFast: !rest.includes("--no-fail-fast"),
    ensureInstall: rest.includes("--ensure-install"),
    platform,
    iosDevice: platform === "android" ? undefined : device,
    androidDevice: platform === "android" ? device : undefined,
  });
  console.log(
    JSON.stringify(
      {
        artifactDir: result.artifactDir,
        aborted: result.aborted,
        claimState: result.claimState,
        results: result.results,
      },
      null,
      2,
    ),
  );
  const hardRed = result.results.some(
    (r) => !r.ok && r.status !== "stub" && r.status !== "os-limit",
  );
  process.exit(hardRed ? 1 : 0);
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help") usage();
  if (cmd === "dry-preflight") return cmdDry(rest);
  if (cmd === "matrix") return cmdMatrix(rest);
  if (cmd === "list") {
    console.log(JSON.stringify(REQUIRED_V2, null, 2));
    return;
  }
  usage();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
