import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { watch as chokidarWatch, type FSWatcher } from "chokidar";
import { DEFAULT_IGNORES } from "./constants";
import { log } from "./log";

export type WatchHandle = {
  backend: "watchman" | "chokidar";
  close: () => Promise<void>;
};

export function watchmanAvailable(): boolean {
  try {
    const r = spawnSync("watchman", ["version"], {
      encoding: "utf8",
      timeout: 3_000,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

/**
 * Prefer Watchman when the CLI is on PATH; otherwise chokidar.
 * Both backends call `onChange` — same restart pipeline downstream.
 */
export function startWatch(
  globs: string[],
  cwd: string,
  onChange: (path: string) => void,
): WatchHandle {
  if (globs.length === 0) {
    return { backend: "chokidar", close: async () => {} };
  }

  if (watchmanAvailable()) {
    try {
      return startWatchman(globs, cwd, onChange);
    } catch (err) {
      log("Watchman setup failed; falling back to chokidar:", err);
    }
  } else {
    log("Watchman not on PATH; using chokidar fallback");
  }

  return startChokidar(globs, cwd, onChange, false);
}

function startChokidar(
  globs: string[],
  cwd: string,
  onChange: (path: string) => void,
  usePolling: boolean,
): WatchHandle {
  // Prefer watching directory roots extracted from globs to cut FD fan-out.
  const roots = rootsFromGlobs(globs);
  const watcher: FSWatcher = chokidarWatch(roots.length ? roots : globs, {
    cwd,
    ignoreInitial: true,
    ignored: DEFAULT_IGNORES,
    awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 25 },
    usePolling,
    interval: usePolling ? 250 : undefined,
    atomic: true,
  });

  const matchesGlob = (relPath: string): boolean => {
    // If user passed exact globs to chokidar roots that are dirs, filter by
    // simple extension / suffix heuristics from the original globs.
    return globs.some((g) => pathMatchesGlob(relPath, g));
  };

  const handler = (relPath: string) => {
    if (matchesGlob(relPath) || roots.length === 0) onChange(relPath);
  };

  watcher.on("add", handler);
  watcher.on("change", handler);
  watcher.on("unlink", handler);
  watcher.on("error", (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    log("chokidar error:", msg);
    if (!usePolling && /EMFILE|ENFILE|too many open files/i.test(msg)) {
      log("EMFILE — restarting watcher with usePolling=true");
      void watcher.close().then(() => {
        const next = startChokidar(globs, cwd, onChange, true);
        handle.backend = next.backend;
        handle.close = next.close;
      });
    }
  });

  const handle: WatchHandle = {
    backend: "chokidar",
    close: async () => {
      await watcher.close();
    },
  };
  return handle;
}

// Extract directory prefixes from globs (e.g. packages/foo/src before **).
function rootsFromGlobs(globs: string[]): string[] {
  const roots = new Set<string>();
  for (const g of globs) {
    const star = g.search(/[*?[{]/);
    const base = star === -1 ? g : g.slice(0, star).replace(/\/$/, "");
    if (base && !base.includes("*")) {
      roots.add(base || ".");
    }
  }
  return [...roots];
}

function pathMatchesGlob(relPath: string, glob: string): boolean {
  // Minimal matcher: ** / * and suffix extension.
  const normalized = relPath.replace(/\\/g, "/");
  const g = glob.replace(/\\/g, "/");
  if (!g.includes("*") && !g.includes("?")) {
    return normalized === g || normalized.endsWith("/" + g);
  }
  // Convert simple glob to RegExp
  let re = "^";
  for (let i = 0; i < g.length; i++) {
    const c = g[i]!;
    if (c === "*" && g[i + 1] === "*") {
      re += ".*";
      i += 1;
      if (g[i + 1] === "/") i += 1;
      continue;
    }
    if (c === "*") {
      re += "[^/]*";
      continue;
    }
    if (c === "?") {
      re += "[^/]";
      continue;
    }
    if (".+^$()[]{}|\\".includes(c)) re += "\\" + c;
    else re += c;
  }
  re += "$";
  try {
    return new RegExp(re).test(normalized);
  } catch {
    return normalized.endsWith(path.extname(g)) || true;
  }
}

function startWatchman(
  globs: string[],
  cwd: string,
  onChange: (path: string) => void,
): WatchHandle {
  const warm = spawnSync("watchman", ["watch-project", cwd], {
    encoding: "utf8",
    timeout: 5_000,
  });
  if (warm.status !== 0) {
    throw new Error(warm.stderr || warm.stdout || "watch-project failed");
  }

  let root = cwd;
  try {
    const parsed = JSON.parse(warm.stdout || "{}") as { watch?: string };
    if (parsed.watch) root = parsed.watch;
  } catch {
    /* use cwd */
  }

  const client: ChildProcess = spawn(
    "watchman",
    ["-j", "--server-encoding=json"],
    { stdio: ["pipe", "pipe", "pipe"], cwd },
  );
  let closed = false;
  const subName = `mcp-dev-${process.pid}`;

  const send = (cmd: unknown) => {
    if (client.stdin?.writable) {
      client.stdin.write(`${JSON.stringify(cmd)}\n`);
    }
  };

  send([
    "subscribe",
    root,
    subName,
    {
      expression: [
        "allof",
        ["type", "f"],
        ["not", ["dirname", "node_modules"]],
        ["not", ["dirname", ".git"]],
        ["not", ["dirname", "build"]],
      ],
      fields: ["name"],
    },
  ]);

  let buffer = "";
  client.stdout?.setEncoding("utf8");
  client.stdout?.on("data", (chunk: string) => {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as {
          subscription?: string;
          files?: Array<{ name?: string }>;
        };
        if (msg.subscription === subName && Array.isArray(msg.files)) {
          for (const f of msg.files) {
            if (!f.name) continue;
            const rel = f.name;
            if (globs.some((g) => pathMatchesGlob(rel, g))) onChange(rel);
          }
        }
      } catch {
        /* ignore partial */
      }
    }
  });

  client.stderr?.setEncoding("utf8");
  client.stderr?.on("data", (d: string) => {
    if (d.trim()) log("watchman:", d.trim());
  });

  client.on("exit", () => {
    if (!closed) log("Watchman client exited; file events may stop");
  });

  log("watching via Watchman subscribe");
  return {
    backend: "watchman",
    close: async () => {
      closed = true;
      try {
        send(["unsubscribe", root, subName]);
      } catch {
        /* ignore */
      }
      client.kill("SIGTERM");
    },
  };
}
