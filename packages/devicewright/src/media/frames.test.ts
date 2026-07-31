import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  clampFps,
  clampMaxFrames,
  clampSeekTime,
  computeFrameTimestamps,
  resolveViewWindow,
} from "./frames";
import { gcDevicewrightTemp } from "./gc";

describe("computeFrameTimestamps", () => {
  test("dense short clip samples at fps", () => {
    const { times, thinned } = computeFrameTimestamps(2, 10, 60);
    expect(thinned).toBe(false);
    expect(times[0]).toBe(0);
    expect(times.at(-1)).toBeCloseTo(2, 5);
    expect(times.length).toBe(21); // 0..2 inclusive at 0.1s
  });

  test("long clip thins evenly to maxFrames", () => {
    const { times, thinned } = computeFrameTimestamps(60, 10, 60);
    expect(thinned).toBe(true);
    expect(times.length).toBe(60);
    expect(times[0]).toBe(0);
    expect(times.at(-1)).toBeCloseTo(60, 5);
  });

  test("single maxFrame", () => {
    const { times, thinned } = computeFrameTimestamps(10, 10, 1);
    expect(thinned).toBe(true);
    expect(times).toEqual([0]);
  });

  test("zero duration", () => {
    expect(computeFrameTimestamps(0, 10, 60)).toEqual({
      times: [0],
      thinned: false,
    });
  });

  test("200ms window at fps 5 stays dense", () => {
    const { times, thinned } = computeFrameTimestamps(0.2, 5, 60);
    expect(thinned).toBe(false);
    expect(times).toEqual([0, 0.2]);
  });
});

describe("resolveViewWindow", () => {
  test("defaults to full duration", () => {
    expect(resolveViewWindow(18.4)).toEqual({ start: 0, end: 18.4 });
  });

  test("clamps end to duration", () => {
    expect(resolveViewWindow(10, 8, 99)).toEqual({ start: 8, end: 10 });
  });

  test("rejects empty or past-end windows", () => {
    expect(() => resolveViewWindow(10, 5, 5)).toThrow(/empty view window/);
    expect(() => resolveViewWindow(10, 12, 14)).toThrow(/past duration/);
  });
});

describe("clamp helpers", () => {
  test("rejects invalid fps/maxFrames", () => {
    expect(() => clampFps(0)).toThrow(/invalid fps/);
    expect(() => clampMaxFrames(0)).toThrow(/invalid maxFrames/);
  });

  test("clampSeekTime stays off EOF", () => {
    expect(clampSeekTime(18.435, 18.435)).toBeCloseTo(18.385, 5);
    expect(clampSeekTime(0, 18.435)).toBe(0);
    expect(clampSeekTime(9, 18.435)).toBe(9);
  });
});

describe("gcDevicewrightTemp", () => {
  test("removes old devicewright-* entries", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dw-gc-test-"));
    const oldFile = path.join(dir, "devicewright-old.mp4");
    const freshFile = path.join(dir, "devicewright-fresh.mp4");
    const other = path.join(dir, "other.txt");
    fs.writeFileSync(oldFile, "x");
    fs.writeFileSync(freshFile, "y");
    fs.writeFileSync(other, "z");
    const oldTime = Date.now() - 48 * 60 * 60 * 1000;
    fs.utimesSync(oldFile, new Date(oldTime), new Date(oldTime));

    const result = gcDevicewrightTemp({
      tmpDir: dir,
      olderThanMs: 24 * 60 * 60 * 1000,
    });
    expect(result.removed).toContain(oldFile);
    expect(fs.existsSync(oldFile)).toBe(false);
    expect(fs.existsSync(freshFile)).toBe(true);
    expect(fs.existsSync(other)).toBe(true);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
