#!/usr/bin/env node
import process from 'node:process';
import type { HostId } from '../claims';
import { applyCuts, cutOrder, HOST_CLAIMS, mustKeepHosts } from '../claims';
import { formatDoctor, runDoctor } from '../doctor';
import { runHostMatrix } from '../test/runner';

function usage(): never {
  console.error(`devicewright <command>

Commands:
  doctor [--android]     Preflight Xcode/idb/sim/adb
  claims                 Print host claim set + cut order
  matrix [--hosts a,b]   Run host journey matrix (macOS / devices required)
  mcp                    Start MCP server on stdio (prefer devicewright-mcp bin)

Env:
  DEVICEWRIGHT_IDB_PATH / IOS_SIMULATOR_MCP_IDB_PATH
  DEVICEWRIGHT_ADB_PATH / ANDROID_HOME
  UITEST_SIM_UDID (optional pin)
`);
  process.exit(2);
}

function cmdDoctor(rest: string[]): void {
  const report = runDoctor({
    requireAndroid: rest.includes('--android'),
  });
  console.log(formatDoctor(report));
  process.exit(report.ok ? 0 : 1);
}

function cmdClaims(): void {
  console.log(
    JSON.stringify(
      {
        claims: HOST_CLAIMS,
        mustKeep: mustKeepHosts(),
        cutFirst: cutOrder(),
        exampleCuts: applyCuts(new Set(mustKeepHosts())),
      },
      null,
      2
    )
  );
}

async function cmdMatrix(rest: string[]): Promise<void> {
  const hostsArg = rest.find((a) => a.startsWith('--hosts='));
  const hosts = hostsArg
    ? (hostsArg.slice('--hosts='.length).split(',').filter(Boolean) as HostId[])
    : undefined;
  const result = await runHostMatrix({ hosts, rounds: 1 });
  console.log(
    JSON.stringify(
      {
        surviving: result.surviving,
        cut: result.cut,
        artifactDir: result.artifactDir,
        results: result.results.map((r) => ({
          host: r.host,
          ok: r.ok,
          error: r.error,
          steps: r.steps,
        })),
      },
      null,
      2
    )
  );
  const mustKeepFailed = result.cut.some((h) => mustKeepHosts().includes(h));
  process.exit(mustKeepFailed ? 1 : 0);
}

async function cmdMcp(): Promise<void> {
  const { startMcpStdio } = await import('../mcp/server');
  await startMcpStdio();
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help') usage();
  if (cmd === 'doctor') return cmdDoctor(rest);
  if (cmd === 'claims') return cmdClaims();
  if (cmd === 'matrix') return cmdMatrix(rest);
  if (cmd === 'mcp') return cmdMcp();
  usage();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
