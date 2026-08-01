import { describe, expect, test } from "bun:test";
import {
  mergeAppClipEntitlements,
  shouldUseAppGroups,
  syncAppGroups,
} from "./plist";

describe("mergeAppClipEntitlements", () => {
  test("adds App Clip specific entitlements", () => {
    const result = mergeAppClipEntitlements({}, "com.example.app");

    expect(result).toEqual({
      "com.apple.developer.parent-application-identifiers": [
        "$(AppIdentifierPrefix)com.example.app",
      ],
      "com.apple.developer.on-demand-install-capable": true,
    });
  });

  test("preserves existing entitlements", () => {
    const result = mergeAppClipEntitlements(
      { "com.apple.security.application-groups": ["group.com.example.app"] },
      "com.example.app",
    );

    expect(result["com.apple.security.application-groups"]).toEqual([
      "group.com.example.app",
    ]);
    expect(result["com.apple.developer.on-demand-install-capable"]).toBe(true);
  });
});

describe("syncAppGroups", () => {
  test("adds main app groups when target has none", () => {
    const result = syncAppGroups({
      targetEntitlements: {},
      mainAppGroups: ["group.com.example.app"],
    });

    expect(result["com.apple.security.application-groups"]).toEqual([
      "group.com.example.app",
    ]);
  });

  test("does not overwrite existing target app groups", () => {
    const result = syncAppGroups({
      targetEntitlements: {
        "com.apple.security.application-groups": ["group.custom"],
      },
      mainAppGroups: ["group.com.example.app"],
    });

    expect(result["com.apple.security.application-groups"]).toEqual([
      "group.custom",
    ]);
  });

  test("returns entitlements unchanged when no main app groups exist", () => {
    const result = syncAppGroups({
      targetEntitlements: { foo: "bar" },
      mainAppGroups: undefined,
    });

    expect(result).toEqual({ foo: "bar" });
  });
});

describe("shouldUseAppGroups", () => {
  test("share, clip, widget, messages, action, and bg-download default to true", () => {
    expect(shouldUseAppGroups("share")).toBe(true);
    expect(shouldUseAppGroups("clip")).toBe(true);
    expect(shouldUseAppGroups("widget")).toBe(true);
    expect(shouldUseAppGroups("messages")).toBe(true);
    expect(shouldUseAppGroups("action")).toBe(true);
    expect(shouldUseAppGroups("bg-download")).toBe(true);
  });

  test("stickers default to false", () => {
    expect(shouldUseAppGroups("stickers")).toBe(false);
  });
});
