import { spawn, type ChildProcess } from "node:child_process";
import process from "node:process";
import {
  DEFAULT_BACKOFF_BASE_MS,
  DEFAULT_BACKOFF_CAP_MS,
  DEFAULT_STABLE_WINDOW_MS,
} from "./constants";
import { debounce } from "./debounce";
import { log } from "./log";
import { runRebuild } from "./rebuild";
import { startWatch, type WatchHandle } from "./watch";

export type SupervisorOptions = {
  childArgv: string[];
  cwd: string;
  watch: string[];
  rebuild: string | null;
  debounceMs: number;
  maxFailures: number;
  cursorConfig: string | null;
};

export type Supervisor = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

export function createSupervisor(opts: SupervisorOptions): Supervisor {
  const [command, ...args] = opts.childArgv;
  if (!command) {
    throw new Error("child command is empty");
  }

  let child: ChildProcess | null = null;
  let watchHandle: WatchHandle | null = null;
  let stopping = false;
  let restarting = false;
  let failureCount = 0;
  let stableTimer: ReturnType<typeof setTimeout> | null = null;
  let gaveUp = false;

  const clearStableTimer = () => {
    if (stableTimer) {
      clearTimeout(stableTimer);
      stableTimer = null;
    }
  };

  const noteStable = () => {
    clearStableTimer();
    stableTimer = setTimeout(() => {
      if (failureCount > 0) {
        log(
          `stable for ${DEFAULT_STABLE_WINDOW_MS}ms — resetting failure count`,
        );
        failureCount = 0;
      }
    }, DEFAULT_STABLE_WINDOW_MS);
  };

  const onParentStdin = (chunk: Buffer | string) => {
    const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    if (!child?.stdin || child.stdin.destroyed || !child.stdin.writable) {
      // Drop in-flight while child is down / restarting
      return;
    }
    child.stdin.write(buf);
  };

  const killChild = async (): Promise<void> => {
    if (!child) return;
    const proc = child;
    child = null;

    await new Promise<void>((resolve) => {
      if (proc.exitCode !== null || proc.signalCode !== null) {
        resolve();
        return;
      }
      const t = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {
          /* ignore */
        }
      }, 2_000);
      proc.once("exit", () => {
        clearTimeout(t);
        resolve();
      });
      try {
        proc.kill("SIGTERM");
      } catch {
        clearTimeout(t);
        resolve();
      }
    });
  };

  const spawnChild = (): void => {
    log("spawn:", opts.childArgv.join(" "));
    child = spawn(command, args, {
      cwd: opts.cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdin?.on("error", () => {
      /* EPIPE when child dies */
    });

    child.stdout?.on("data", (chunk: Buffer) => {
      process.stdout.write(chunk);
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    child.on("exit", (code, signal) => {
      child = null;
      if (stopping || restarting || gaveUp) return;
      log(`child exited (code=${code} signal=${signal})`);
      void handleCrash();
    });

    noteStable();
  };

  const recordFailure = (reason: string): boolean => {
    failureCount += 1;
    log(`failure ${failureCount}/${opts.maxFailures}: ${reason}`);
    if (failureCount >= opts.maxFailures) {
      gaveUp = true;
      log(
        "giving up — max failures reached (fix child/rebuild and restart mcp-dev)",
      );
      return false;
    }
    return true;
  };

  const backoffMs = (): number =>
    Math.min(
      DEFAULT_BACKOFF_CAP_MS,
      DEFAULT_BACKOFF_BASE_MS * 2 ** Math.max(0, failureCount - 1),
    );

  const handleCrash = async (): Promise<void> => {
    if (stopping || gaveUp) return;
    if (!recordFailure("child crash")) return;
    const wait = backoffMs();
    log(`restarting child in ${wait}ms`);
    await sleep(wait);
    if (stopping || gaveUp) return;
    spawnChild();
  };

  const doReload = async (path: string): Promise<void> => {
    if (stopping || gaveUp || restarting) return;
    restarting = true;
    try {
      log(`change: ${path}`);
      if (opts.rebuild) {
        const result = await runRebuild(opts.rebuild, opts.cwd);
        if (!result.ok) {
          // Keep last-good child; do not respawn onto a failed build.
          recordFailure("rebuild failed");
          return;
        }
        failureCount = 0;
      }

      log("restarting child");
      await killChild();
      if (stopping) return;
      spawnChild();
      // Do NOT bump cursor-config on every reload — that forces Cursor to
      // respawn mcp-dev itself and historically leaked 80+ watchers. Child
      // restart already picks up the new build on the same stdio session.
      // Use a one-shot bump at supervisor start when --cursor-config is set.
    } finally {
      restarting = false;
    }
  };

  let lastPath = "";
  const { trigger, cancel } = debounce(() => {
    void doReload(lastPath || "(watch)");
  }, opts.debounceMs);

  const onWatchEvent = (path: string) => {
    lastPath = path;
    trigger();
  };

  return {
    async start() {
      if (!process.stdin.isTTY) {
        process.stdin.resume();
      }
      process.stdin.on("data", onParentStdin);

      spawnChild();
      // Never auto-bump mcp.json here. Bumping MCP_DEV_REFRESH makes Cursor
      // respawn mcp-dev, which re-enters start() and historically leaked 80+
      // watchers. Child restart on file watch already serves the new build on
      // the same stdio session; bump MCP_DEV_REFRESH manually when the tool
      // catalog shape changes.
      if (opts.cursorConfig) {
        log(
          `cursor-config ${opts.cursorConfig} noted — not auto-bumping (set MCP_DEV_REFRESH manually to refresh Cursor's tool catalog)`,
        );
      }
      if (opts.watch.length > 0) {
        watchHandle = startWatch(opts.watch, opts.cwd, onWatchEvent);
        log(`watching (${watchHandle.backend}):`, opts.watch.join(", "));
      } else {
        log("no --watch globs; child runs without reload");
      }
    },
    async stop() {
      stopping = true;
      cancel();
      clearStableTimer();
      process.stdin.off("data", onParentStdin);
      if (watchHandle) {
        await watchHandle.close();
        watchHandle = null;
      }
      await killChild();
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
