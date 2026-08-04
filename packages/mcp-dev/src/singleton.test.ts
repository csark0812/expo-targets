import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  acquireMcpDevSingleton,
  singletonKey,
  singletonPath,
} from "./singleton";

describe("mcp-dev singleton", () => {
  const cwd = "/tmp/mcp-dev-singleton-test-cwd";
  const child = ["node", "/tmp/fake-mcp.js"];
  const key = singletonKey(cwd, child);
  const file = singletonPath(key);

  afterEach(() => {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  });

  test("singletonKey is stable for same cwd+argv", () => {
    expect(singletonKey(cwd, child)).toBe(singletonKey(cwd, child));
    expect(singletonKey(cwd, child)).not.toBe(
      singletonKey(cwd, ["node", "/tmp/other.js"]),
    );
  });

  test("acquire writes pid and release clears", () => {
    const handle = acquireMcpDevSingleton(cwd, child);
    expect(handle.key).toBe(key);
    expect(fs.existsSync(file)).toBe(true);
    expect(Number(fs.readFileSync(file, "utf8").trim())).toBe(process.pid);
    handle.release();
    expect(fs.existsSync(file)).toBe(false);
  });

  test("second acquire steals from dead pid file", () => {
    fs.writeFileSync(file, "999999999\n");
    const handle = acquireMcpDevSingleton(cwd, child);
    expect(Number(fs.readFileSync(file, "utf8").trim())).toBe(process.pid);
    handle.release();
  });
});

void os;
void path;
