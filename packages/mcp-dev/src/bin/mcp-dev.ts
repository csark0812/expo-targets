#!/usr/bin/env node
import process from "node:process";
import { parseArgs, usage } from "../cli";
import { fatal, log } from "../log";
import { acquireMcpDevSingleton } from "../singleton";
import { createSupervisor } from "../supervisor";

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    fatal(`${err instanceof Error ? err.message : err}\n\n${usage()}`);
  }

  if ("help" in parsed) {
    process.stderr.write(`${usage()}\n`);
    process.exit(0);
  }

  const cwd = parsed.cwd ?? process.cwd();
  const singleton = acquireMcpDevSingleton(cwd, parsed.childArgv);

  const supervisor = createSupervisor({
    childArgv: parsed.childArgv,
    cwd,
    watch: parsed.watch,
    rebuild: parsed.rebuild,
    debounceMs: parsed.debounceMs,
    maxFailures: parsed.maxFailures,
    cursorConfig: parsed.cursorConfig,
  });

  const shutdown = async (signal: string) => {
    log(`shutting down (${signal})`);
    try {
      await supervisor.stop();
    } finally {
      singleton.release();
      process.exit(0);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await supervisor.start();
}

main().catch((err) => {
  fatal(err instanceof Error ? err.stack || err.message : String(err));
});
