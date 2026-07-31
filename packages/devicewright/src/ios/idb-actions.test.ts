import { describe, expect, test } from "bun:test";

import { normalizeHardwareButton, resolveKeycode } from "./idb";

describe("idb key/button argv helpers", () => {
  test("resolveKeycode maps named keys and numeric codes", () => {
    expect(resolveKeycode("enter")).toBe(40);
    expect(resolveKeycode("RETURN")).toBe(40);
    expect(resolveKeycode("delete")).toBe(42);
    expect(resolveKeycode("40")).toBe(40);
    expect(() => resolveKeycode("f1")).toThrow(/unsupported key/);
  });

  test("normalizeHardwareButton accepts idb button enum", () => {
    expect(normalizeHardwareButton("home")).toBe("HOME");
    expect(normalizeHardwareButton("SIDE_BUTTON")).toBe("SIDE_BUTTON");
    expect(() => normalizeHardwareButton("VOLUME_UP")).toThrow(
      /invalid hardware button/,
    );
  });
});
