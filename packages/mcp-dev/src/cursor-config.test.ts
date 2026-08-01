import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bumpCursorConfig, MCP_DEV_REFRESH_ENV } from "./cursor-config";

describe("bumpCursorConfig", () => {
  test("bumps MCP_DEV_REFRESH on mcp-dev server entries only", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-dev-cfg-"));
    const cfg = path.join(dir, "mcp.json");
    fs.writeFileSync(
      cfg,
      JSON.stringify(
        {
          mcpServers: {
            other: { command: "npx", args: ["-y", "ios-simulator-mcp"] },
            dw: {
              command: "node",
              args: [
                "/abs/packages/mcp-dev/build/bin/mcp-dev.js",
                "--",
                "node",
                "x",
              ],
              env: { PATH: "/bin" },
            },
          },
        },
        null,
        2,
      ),
    );

    const { updated, token } = bumpCursorConfig(cfg);
    expect(updated).toEqual(["dw"]);
    const parsed = JSON.parse(fs.readFileSync(cfg, "utf8")) as {
      mcpServers: {
        other: { env?: Record<string, string> };
        dw: { env: Record<string, string> };
      };
    };
    expect(parsed.mcpServers.dw.env[MCP_DEV_REFRESH_ENV]).toBe(token);
    expect(parsed.mcpServers.dw.env.PATH).toBe("/bin");
    expect(parsed.mcpServers.other.env?.[MCP_DEV_REFRESH_ENV]).toBeUndefined();
  });
});
