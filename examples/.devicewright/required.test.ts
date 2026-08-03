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

  test("live-activity is in REQUIRED_V2 phase 3 and remains CLAIMS", () => {
    expect(REQUIRED_V2_PHASE3.some((r) => r.id === "live-activity")).toBe(true);
    expect(OS_LIMIT_CLAIMS.some((c) => c.id === "live-activity")).toBe(true);
  });

  test("notification-content is absent from OS_LIMIT_CLAIMS after C1", () => {
    expect(OS_LIMIT_CLAIMS.some((c) => c.id === "notification-content")).toBe(
      false,
    );
  });

  test("notification-service is absent from OS_LIMIT_CLAIMS (APNs Sandbox path)", () => {
    expect(OS_LIMIT_CLAIMS.some((c) => c.id === "notification-service")).toBe(
      false,
    );
  });

  test("content-blocker is absent from OS_LIMIT_CLAIMS (local css-display-none fixture)", () => {
    expect(OS_LIMIT_CLAIMS.some((c) => c.id === "content-blocker")).toBe(false);
  });

  test("stickers is absent from OS_LIMIT_CLAIMS (Sticker:*.png draft insert)", () => {
    expect(OS_LIMIT_CLAIMS.some((c) => c.id === "stickers")).toBe(false);
  });

  test("keyboard is absent from OS_LIMIT_CLAIMS (Full Access + typed:ET)", () => {
    expect(OS_LIMIT_CLAIMS.some((c) => c.id === "keyboard")).toBe(false);
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
