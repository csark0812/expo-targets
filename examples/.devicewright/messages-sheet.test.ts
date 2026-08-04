import { describe, expect, test } from "bun:test";
import {
  columnHotspots,
  messagesSheetControlHotspots,
  messagesSheetStyleHotspots,
} from "./journeys/messages-sheet";

describe("messages-sheet hotspots (MCP describePoint ladder)", () => {
  test("columnHotspots is inclusive and stepped", () => {
    expect(columnHotspots(210, 400, 448, 16)).toEqual([
      { x: 210, y: 400 },
      { x: 210, y: 416 },
      { x: 210, y: 432 },
      { x: 210, y: 448 },
    ]);
  });

  test("control ladder covers compact + expanded sheet band with fine step", () => {
    const hs = messagesSheetControlHotspots();
    const ys = hs.filter((h) => h.x === 210).map((h) => h.y);
    expect(ys[0]).toBeLessThanOrEqual(360);
    expect(ys[ys.length - 1]).toBeGreaterThanOrEqual(824);
    // step 16 → top-edge describePoint misses cannot skip a 38px button
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i] - ys[i - 1]).toBe(16);
    }
  });

  test("style ladder covers expanded (~390) and compact (~615) text bands", () => {
    const ys = messagesSheetStyleHotspots()
      .filter((h) => h.x === 80)
      .map((h) => h.y);
    expect(ys.some((y) => y >= 380 && y <= 410)).toBe(true);
    expect(ys.some((y) => y >= 600 && y <= 630)).toBe(true);
  });
});
