import { describe, expect, test } from "bun:test";
import { parseArgs, usage } from "./cli";
import { debounce } from "./debounce";

describe("parseArgs", () => {
  test("parses watch, rebuild, and child after --", () => {
    const opts = parseArgs([
      "--watch",
      "src/**/*.ts",
      "--watch",
      "lib/**/*.js",
      "--rebuild",
      "npm run build",
      "--cwd",
      "/tmp/proj",
      "--",
      "node",
      "./build/mcp.js",
    ]);
    expect("help" in opts).toBe(false);
    if ("help" in opts) return;
    expect(opts.watch).toEqual(["src/**/*.ts", "lib/**/*.js"]);
    expect(opts.rebuild).toBe("npm run build");
    expect(opts.cwd).toBe("/tmp/proj");
    expect(opts.childArgv).toEqual(["node", "./build/mcp.js"]);
    expect(opts.debounceMs).toBe(250);
    expect(opts.maxFailures).toBe(5);
    expect(opts.cursorConfig).toBe(null);
  });

  test("help", () => {
    expect(parseArgs(["--help"])).toEqual({ help: true });
    expect(usage()).toContain("mcp-dev");
  });

  test("requires child after --", () => {
    expect(() => parseArgs(["--watch", "a"])).toThrow(/Missing child/);
  });

  test("rejects unknown flags before --", () => {
    expect(() => parseArgs(["--nope", "--", "node"])).toThrow(/Unknown/);
  });

  test("parses --cursor-config", () => {
    const opts = parseArgs([
      "--cursor-config",
      "/tmp/mcp.json",
      "--",
      "node",
      "./build/mcp.js",
    ]);
    expect("help" in opts).toBe(false);
    if ("help" in opts) return;
    expect(opts.cursorConfig).toBe("/tmp/mcp.json");
    expect(opts.childArgv).toEqual(["node", "./build/mcp.js"]);
  });
});

describe("debounce", () => {
  test("coalesces bursts into one call", async () => {
    let n = 0;
    const { trigger, cancel } = debounce(() => {
      n += 1;
    }, 40);
    trigger();
    trigger();
    trigger();
    expect(n).toBe(0);
    await new Promise((r) => setTimeout(r, 80));
    expect(n).toBe(1);
    cancel();
  });

  test("cancel prevents pending call", async () => {
    let n = 0;
    const { trigger, cancel } = debounce(() => {
      n += 1;
    }, 40);
    trigger();
    cancel();
    await new Promise((r) => setTimeout(r, 80));
    expect(n).toBe(0);
  });
});
