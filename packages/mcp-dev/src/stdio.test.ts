import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import path from "node:path";

const bin = path.join(import.meta.dir, "../build/bin/mcp-dev.js");

describe("mcp-dev stdio proxy", () => {
  test("child stdout reaches parent stdout; logs stay on stderr", async () => {
    const childScript =
      'process.stdout.write("{\\"jsonrpc\\":\\"2.0\\",\\"id\\":1,\\"result\\":{}}\\n");setInterval(function(){},60000)';

    const nodeBin = process.env.npm_node_execpath || "node";
    const proc = spawn(nodeBin, [bin, "--", nodeBin, "-e", childScript], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout?.setEncoding("utf8");
    proc.stderr?.setEncoding("utf8");

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => {
        reject(
          new Error(
            `timeout waiting for stdout. out=${JSON.stringify(stdout)} err=${JSON.stringify(stderr)}`,
          ),
        );
      }, 3_000);
      const onOut = (d: string) => {
        stdout += d;
        if (stdout.includes("jsonrpc")) {
          clearTimeout(t);
          resolve();
        }
      };
      const onErr = (d: string) => {
        stderr += d;
      };
      proc.stdout?.on("data", onOut);
      proc.stderr?.on("data", onErr);
      proc.on("error", (e) => {
        clearTimeout(t);
        reject(e);
      });
    });

    proc.kill("SIGTERM");
    await new Promise<void>((resolve) => proc.on("close", () => resolve()));

    expect(stdout).toContain('"jsonrpc":"2.0"');
    expect(stdout).not.toContain("[mcp-dev]");
    expect(stderr).toContain("[mcp-dev]");
  });
});
