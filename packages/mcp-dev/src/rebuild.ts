import { spawn } from "node:child_process";
import process from "node:process";
import { log } from "./log";

export type RebuildResult = { ok: boolean; code: number | null };

/**
 * Run a rebuild shell command. Stdout/stderr of the rebuild go to parent stderr
 * so MCP stdout stays clean.
 */
export function runRebuild(
  command: string,
  cwd: string,
): Promise<RebuildResult> {
  return new Promise((resolve) => {
    log("rebuild:", command);
    const child = spawn(command, {
      shell: true,
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (d: string) => {
      for (const line of d.split(/\r?\n/)) {
        if (line) log("rebuild|", line);
      }
    });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (d: string) => {
      for (const line of d.split(/\r?\n/)) {
        if (line) log("rebuild|", line);
      }
    });

    child.on("error", (err) => {
      log("rebuild spawn error:", err.message);
      resolve({ ok: false, code: null });
    });

    child.on("close", (code) => {
      if (code === 0) {
        log("rebuild ok");
        resolve({ ok: true, code: 0 });
      } else {
        log(`rebuild failed (exit ${code}) — keeping last-good child`);
        resolve({ ok: false, code });
      }
    });
  });
}
