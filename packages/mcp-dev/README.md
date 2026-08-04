# mcp-dev

Metro-like **stdio supervisor** for developing MCP servers: watch → optional rebuild → restart the child MCP while Cursor keeps talking to the parent process.

Logs go to **stderr** only. MCP protocol bytes stay on **stdout**.

## Install

```bash
npm install -g @csark0812/mcp-dev
# or
npx -y @csark0812/mcp-dev --help
```

Package name is scoped (`@csark0812/mcp-dev`). The CLI bin remains `mcp-dev`.

## Cursor mcp.json

After publish:

```json
{
  "mcpServers": {
    "my-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@csark0812/mcp-dev",
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

`--cursor-config` is accepted for back-compat and logged; mcp-dev does **not** auto-bump `MCP_DEV_REFRESH` (that respawned Cursor MCP workers and leaked watchers). Bump the env in mcp.json **manually** when the tool catalog shape changes. (Cursor currently ignores MCP `notifications/tools/list_changed`.)

mcp-dev also acquires a **system-wide singleton** per cwd + child argv: a second spawn steals by killing the prior mcp-dev tree so Cursor multi-window reloads do not orphan dozens of watchers.

## Flags

| Flag                     | Meaning                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `--watch <glob>`         | Watch glob (repeatable). Enables reload pipeline.                                    |
| `--rebuild <cmd>`        | Shell command before restart (optional).                                             |
| `--cwd <dir>`            | cwd for child + rebuild (default: `process.cwd()`).                                  |
| `--debounce <ms>`        | Coalesce window (default: `250`).                                                    |
| `--max-failures <n>`     | Consecutive crash/rebuild-fail cap (default: `5`).                                   |
| `--cursor-config <path>` | Accepted for back-compat; no longer auto-bumps `MCP_DEV_REFRESH`. Bump manually to refresh Cursor’s tool catalog. |
| `--`                     | Everything after is the child MCP command.                                           |

## Behavior

- **Singleton:** one live mcp-dev per cwd+child; steals/kills prior tree on acquire.
- **Rebuild fail:** last-good child keeps running; no restart onto a failed build.
- **Crash:** restart with exponential backoff until `--max-failures`, then give up.
- **Stable window:** 10s without failure resets the counter.
- **Watch:** Watchman when the `watchman` CLI is on `PATH`; otherwise chokidar. Same reload pipeline either way.
- Default ignores: `node_modules`, `.git`, `build`, `dist`.
- **No auto `MCP_DEV_REFRESH` bump** on start or reload (prevents Cursor respawn storms).

## Watchman

Optional. Install via Homebrew (`brew install watchman`) for Metro-like native watching. Without it, chokidar is used automatically.
