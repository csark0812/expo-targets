import { describe, expect, test } from "bun:test";
import { iosSimulatorReleaseBuildArgs } from "./ensure-install";

describe("iOS Release ensure-install build flags", () => {
  test("preserves signing so App Group entitlements are embedded in simulator products", () => {
    const args = iosSimulatorReleaseBuildArgs(
      "ETNAction.xcworkspace",
      "ETNAction",
      "SIMULATOR-UDID",
      "/tmp/derived-data",
    );

    expect(args).toContain("CODE_SIGNING_ALLOWED=YES");
    expect(args).not.toContain("CODE_SIGNING_ALLOWED=NO");
  });
});
