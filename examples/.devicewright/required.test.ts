import { describe, expect, test } from "bun:test";
import {
  REQUIRED_V2,
  REQUIRED_V2_PHASE1,
  REQUIRED_V2_PHASE2,
  REQUIRED_V2_PHASE3,
  REQUIRED_V2_PHASE4,
  REQUIRED_V2_PHASE5,
} from "./required";
import { exampleExists } from "./root";
import { OS_LIMIT_CLAIMS } from "./claims";
import { TOUCHPOINTS } from "./touchpoints";

describe("REQUIRED_V2", () => {
  test("phase partitions cover REQUIRED_V2", () => {
    expect([
      ...REQUIRED_V2_PHASE1,
      ...REQUIRED_V2_PHASE2,
      ...REQUIRED_V2_PHASE3,
      ...REQUIRED_V2_PHASE4,
      ...REQUIRED_V2_PHASE5,
    ]).toEqual([...REQUIRED_V2]);
  });

  test("every REQUIRED path exists on disk", () => {
    for (const row of REQUIRED_V2) {
      expect(exampleExists(row.path)).toBe(true);
    }
  });

  test("seed V1 paths remain present", () => {
    const paths = REQUIRED_V2.map((r) => r.path);
    for (const p of [
      "examples/share",
      "examples/action",
      "examples/native/share",
      "examples/native/action",
      "examples/messages",
      "examples/stickers",
      "examples/clip",
      "examples/widgets",
      "examples/native/clip",
    ]) {
      expect(paths).toContain(p);
    }
  });
});

describe("CLAIMS + touchpoints", () => {
  test("CLAIMS ids are unique", () => {
    const ids = OS_LIMIT_CLAIMS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("T1–T3 touchpoints are concrete", () => {
    const early = TOUCHPOINTS.filter((t) =>
      ["T1", "T2", "T3"].includes(t.tranche),
    );
    expect(early.length).toBeGreaterThan(0);
    for (const t of early) {
      expect(t.status).toBe("concrete");
    }
  });
});
