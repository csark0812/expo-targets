import fs from "node:fs";
import { log } from "./log";

export const MCP_DEV_REFRESH_ENV = "MCP_DEV_REFRESH";

type McpJson = {
  mcpServers?: Record<
    string,
    {
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      [key: string]: unknown;
    }
  >;
};

function looksLikeMcpDevServer(entry: {
  command?: string;
  args?: string[];
}): boolean {
  const blob = [entry.command ?? "", ...(entry.args ?? [])].join(" ");
  return /\bmcp-dev\b/.test(blob) || blob.includes("mcp-dev.js");
}

/**
 * Cursor ignores tools/list_changed mid-session. Bumping a sentinel env in
 * mcp.json forces Cursor to re-read the config and refetch tools.
 * Only mutates stdio server entries that look like mcp-dev wrappers.
 */
export function bumpCursorConfig(configPath: string): {
  updated: string[];
  token: string;
} {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw) as McpJson;
  const servers = parsed.mcpServers;
  if (!servers || typeof servers !== "object") {
    throw new Error(`no mcpServers in ${configPath}`);
  }

  const token = String(Date.now());
  const updated: string[] = [];

  for (const [name, entry] of Object.entries(servers)) {
    if (!entry || typeof entry !== "object") continue;
    if (!looksLikeMcpDevServer(entry)) continue;
    if (!entry.env || typeof entry.env !== "object") {
      entry.env = {};
    }
    entry.env[MCP_DEV_REFRESH_ENV] = token;
    updated.push(name);
  }

  if (updated.length === 0) {
    log(
      `cursor-config: no mcp-dev server entries found in ${configPath} (skipped bump)`,
    );
    return { updated, token };
  }

  fs.writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  log(
    `cursor-config: bumped ${MCP_DEV_REFRESH_ENV}=${token} on [${updated.join(", ")}]`,
  );
  return { updated, token };
}
