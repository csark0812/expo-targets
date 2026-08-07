import { describe, expect, test } from "bun:test";
import {
  ANDROID_HYPHEN_DEBT_IDS,
  scanAndroidHyphenDebtFromCatalog,
} from "./android-hyphen-debt";
import { REQUIRED_ANDROID_IDS } from "./required";

describe("ANDROID_HYPHEN_DEBT_IDS", () => {
  test("is a frozen list and each id is in REQUIRED_ANDROID", () => {
    expect(Object.isFrozen(ANDROID_HYPHEN_DEBT_IDS)).toBe(true);
    const android = new Set<string>(REQUIRED_ANDROID_IDS);
    for (const id of ANDROID_HYPHEN_DEBT_IDS) {
      expect(android.has(id)).toBe(true);
    }
  });

  test("matches catalog hyphen scan for REQUIRED_ANDROID", () => {
    expect([...ANDROID_HYPHEN_DEBT_IDS].sort()).toEqual(
      scanAndroidHyphenDebtFromCatalog().sort(),
    );
  });
});
