export type CliOptions = {
  watch: string[];
  rebuild: string | null;
  cwd: string | null;
  childArgv: string[];
  debounceMs: number;
  maxFailures: number;
  cursorConfig: string | null;
};

export function usage(): string {
  return `Usage: mcp-dev [options] -- <command> [args...]

Metro-like stdio supervisor for MCP servers: watch → optional rebuild → restart child.
Parent keeps Cursor's stdio session; child is the real MCP. Logs go to stderr only.

Options:
  --watch <glob>              Watch glob (repeatable). When set, enables watch+restart.
  --rebuild <cmd>             Shell command to run before restarting (optional).
  --cwd <dir>                 Working directory for child and rebuild (default: process.cwd()).
  --debounce <ms>             Watch debounce (default: 250).
  --max-failures <n>          Consecutive crash/rebuild-fail cap before giving up (default: 5).
  --cursor-config <path>      Accepted for back-compat; mcp-dev no longer auto-bumps
                              MCP_DEV_REFRESH (that respawned Cursor MCP and leaked
                              watchers). Bump the env manually when the tool catalog
                              shape changes.
  -h, --help                  Show help.

Examples:
  mcp-dev --watch "src/**/*.ts" --rebuild "npm run build" -- node ./build/bin/mcp.js

  # Pre-publish (monorepo) + force Cursor tool catalog refresh:
  node packages/mcp-dev/build/bin/mcp-dev.js \\
    --watch "packages/my-mcp/src/**/*.ts" \\
    --rebuild "bun run --filter my-mcp build" \\
    --cursor-config "$HOME/.cursor/mcp.json" -- \\
    node packages/my-mcp/build/bin/mcp.js

  # After publish:
  npx -y mcp-dev --watch "src/**/*.ts" --rebuild "npm run build" -- node ./build/mcp.js
`;
}

export function parseArgs(argv: string[]): CliOptions | { help: true } {
  const watch: string[] = [];
  let rebuild: string | null = null;
  let cwd: string | null = null;
  let debounceMs = 250;
  let maxFailures = 5;
  let cursorConfig: string | null = null;
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") {
      return { help: true };
    }
    if (arg === "--") {
      i += 1;
      break;
    }
    if (arg === "--watch") {
      const v = argv[++i];
      if (!v) throw new Error("--watch requires a glob");
      watch.push(v);
      i += 1;
      continue;
    }
    if (arg === "--rebuild") {
      const v = argv[++i];
      if (!v) throw new Error("--rebuild requires a command string");
      rebuild = v;
      i += 1;
      continue;
    }
    if (arg === "--cwd") {
      const v = argv[++i];
      if (!v) throw new Error("--cwd requires a directory");
      cwd = v;
      i += 1;
      continue;
    }
    if (arg === "--debounce") {
      const v = argv[++i];
      if (!v) throw new Error("--debounce requires a number");
      debounceMs = Number(v);
      if (!Number.isFinite(debounceMs) || debounceMs < 0) {
        throw new Error("--debounce must be a non-negative number");
      }
      i += 1;
      continue;
    }
    if (arg === "--max-failures") {
      const v = argv[++i];
      if (!v) throw new Error("--max-failures requires a number");
      maxFailures = Number(v);
      if (!Number.isInteger(maxFailures) || maxFailures < 1) {
        throw new Error("--max-failures must be an integer >= 1");
      }
      i += 1;
      continue;
    }
    if (arg === "--cursor-config") {
      const v = argv[++i];
      if (!v) throw new Error("--cursor-config requires a path");
      cursorConfig = v;
      i += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg} (use -- before the child command)`);
  }

  const childArgv = argv.slice(i);
  if (childArgv.length === 0) {
    throw new Error("Missing child command after --");
  }

  return {
    watch,
    rebuild,
    cwd,
    childArgv,
    debounceMs,
    maxFailures,
    cursorConfig,
  };
}
