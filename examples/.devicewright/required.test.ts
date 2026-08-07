import { describe, expect, test } from "bun:test";
import {
  MUST_GREEN_ANDROID,
  MUST_REMAIN_GREEN_ANDROID,
  REQUIRED_ANDROID,
  REQUIRED_ANDROID_IDS,
  REQUIRED_V2,
  REQUIRED_V2_PHASE1,
  REQUIRED_V2_PHASE2,
  REQUIRED_V2_PHASE3,
  REQUIRED_V2_PHASE4,
  REQUIRED_V2_PHASE5,
} from "./required";
import { exampleExists } from "./root";
import { claimAllowsPlatform, OS_LIMIT_CLAIMS } from "./claims";
import { TOUCHPOINTS } from "./touchpoints";

function claimPlatforms(
  entry: (typeof OS_LIMIT_CLAIMS)[number],
): readonly ("ios" | "android")[] {
  return entry.platforms ?? ["ios"];
}

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

  test("notification-service has no iOS CLAIMS row (APNs Sandbox path)", () => {
    expect(
      OS_LIMIT_CLAIMS.some(
        (c) =>
          c.id === "notification-service" && claimPlatforms(c).includes("ios"),
      ),
    ).toBe(false);
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

describe("REQUIRED_ANDROID", () => {
  test("has length 26 and equals REQUIRED_ANDROID_IDS membership", () => {
    expect(REQUIRED_ANDROID).toHaveLength(26);
    expect(REQUIRED_ANDROID_IDS).toHaveLength(26);
    expect(REQUIRED_ANDROID.map((r) => r.id).sort()).toEqual(
      [...REQUIRED_ANDROID_IDS].sort(),
    );
  });

  test("every REQUIRED_ANDROID id exists in REQUIRED_V2", () => {
    for (const id of REQUIRED_ANDROID_IDS) {
      expect(REQUIRED_V2.some((r) => r.id === id)).toBe(true);
    }
  });

  test("MUST_GREEN and MUST_REMAIN_GREEN are subsets of REQUIRED_ANDROID and disjoint", () => {
    const android = new Set(REQUIRED_ANDROID_IDS);
    for (const id of MUST_GREEN_ANDROID) {
      expect(android.has(id)).toBe(true);
    }
    for (const id of MUST_REMAIN_GREEN_ANDROID) {
      expect(android.has(id)).toBe(true);
    }
    const green = new Set(MUST_GREEN_ANDROID);
    for (const id of MUST_REMAIN_GREEN_ANDROID) {
      expect(green.has(id)).toBe(false);
    }
  });

  test("draft Android CLAIMS cover os-limit-capable ids only", () => {
    const mustGreen = new Set<string>([
      ...MUST_GREEN_ANDROID,
      ...MUST_REMAIN_GREEN_ANDROID,
    ]);
    const osLimitCapable = REQUIRED_ANDROID_IDS.filter((id) => !mustGreen.has(id));
    for (const id of osLimitCapable) {
      expect(claimAllowsPlatform(id, "android")).toBe(true);
    }
    for (const id of mustGreen) {
      expect(claimAllowsPlatform(id, "android")).toBe(false);
    }
  });
});

describe("CLAIMS + touchpoints", () => {
  test("CLAIMS (id, platforms) keys are unique", () => {
    const keys = OS_LIMIT_CLAIMS.map(
      (c) => `${c.id}:${[...claimPlatforms(c)].sort().join("+")}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
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
