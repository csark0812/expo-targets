# mcp-dev

Metro-like **stdio supervisor** for developing MCP servers: watch → optional rebuild → restart the child MCP while Cursor keeps talking to the parent process.

Logs go to **stderr** only. MCP protocol bytes stay on **stdout**.

## Install

```bash
npm install -g mcp-dev
# or
npx -y mcp-dev --help
```

## Cursor mcp.json

After publish:

```json
{
  "mcpServers": {
    "my-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-dev",
        "--watch",
        "src/**/*.ts",
        "--rebuild",
        "npm run build",
        "--cursor-config",
        "/Users/YOU/.cursor/mcp.json",
        "--",
        "node",
        "./build/bin/mcp.js"
      ],
      "env": {
        "MCP_DEV_REFRESH": "0"
      }
    }
  }
}
```

Pre-publish (monorepo checkout of any MCP package):

```json
{
  "command": "node",
  "args": [
    "/ABS/PATH/packages/mcp-dev/build/bin/mcp-dev.js",
    "--watch",
    "packages/my-mcp/src/**/*.ts",
    "--rebuild",
    "bun run --filter my-mcp build",
    "--cursor-config",
    "/Users/YOU/.cursor/mcp.json",
    "--",
    "node",
    "packages/my-mcp/build/bin/mcp.js"
  ],
  "env": {
    "MCP_DEV_REFRESH": "0"
  }
}
```

`--cursor-config` bumps `MCP_DEV_REFRESH` in that file after each successful watch reload so Cursor re-reads mcp.json and refetches the tool catalog. (Cursor currently ignores MCP `notifications/tools/list_changed`.)

## Flags

| Flag                     | Meaning                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `--watch <glob>`         | Watch glob (repeatable). Enables reload pipeline.                                    |
| `--rebuild <cmd>`        | Shell command before restart (optional).                                             |
| `--cwd <dir>`            | cwd for child + rebuild (default: `process.cwd()`).                                  |
| `--debounce <ms>`        | Coalesce window (default: `250`).                                                    |
| `--max-failures <n>`     | Consecutive crash/rebuild-fail cap (default: `5`).                                   |
| `--cursor-config <path>` | After successful reload, bump `MCP_DEV_REFRESH` on mcp-dev entries in this mcp.json. |
| `--`                     | Everything after is the child MCP command.                                           |

## Behavior

- **Rebuild fail:** last-good child keeps running; no restart onto a failed build.
- **Crash:** restart with exponential backoff until `--max-failures`, then give up (does **not** bump cursor-config).
- **Stable window:** 10s without failure resets the counter.
- **Watch:** Watchman when the `watchman` CLI is on `PATH`; otherwise chokidar. Same reload pipeline either way.
- Default ignores: `node_modules`, `.git`, `build`, `dist`.

## Watchman

Optional. Install via Homebrew (`brew install watchman`) for Metro-like native watching. Without it, chokidar is used automatically.
