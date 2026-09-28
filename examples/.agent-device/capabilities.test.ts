import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { CAPABILITY_LEDGER, blockingCapabilities } from "./capabilities";
import { repoRoot } from "./root";

function source(relative: string): string {
  return fs.readFileSync(path.join(repoRoot(), relative), "utf8");
}

describe("agent-device capability ledger", () => {
  test("has unique primitive owners", () => {
    const names = CAPABILITY_LEDGER.map((entry) => entry.primitive);
    expect(new Set(names).size).toBe(names.length);
  });

  test("does not hide load-bearing gaps as fixture commands", () => {
    for (const entry of CAPABILITY_LEDGER) {
      if (entry.loadBearing && entry.disposition === "fixture-only-platform-command") {
        throw new Error(`${entry.primitive} cannot be fixture-only`);
      }
    }
  });

  test("has no load-bearing blocker on the reviewed fork pin", () => {
    expect(blockingCapabilities()).toEqual([]);
    for (const primitive of ["lock", "wear-pair", "launchApp(env)", "describePoint"]) {
      expect(CAPABILITY_LEDGER.find((entry) => entry.primitive === primitive)?.disposition).toBe(
        "agent-device-client",
      );
    }
  });

  test("routes fork capabilities through the driver and their affected journeys", () => {
    const driver = source("examples/.agent-device/driver.ts");
    for (const publicCall of [
      "launchEnvironment: options.env",
      "client.capture.inspectPoint",
      "client.command.screenLock",
      "client.devices.pairWearable",
    ]) {
      expect(driver).toContain(publicCall);
    }

    expect(source("examples/.agent-device/journeys/clip.ts")).toContain(
      "_XCAppClipURL",
    );
    for (const journey of ["messages.ts", "share.ts", "stickers.ts"]) {
      expect(
        source(`examples/.agent-device/journeys/${journey}`),
      ).toContain("findNamedViaPointProbe");
    }
    for (const journey of [
      "notification-service.ts",
      "notification-content.ts",
      "live-activity.ts",
    ]) {
      expect(
        source(`examples/.agent-device/journeys/${journey}`),
      ).toContain('button: "LOCK"');
    }
    const watch = source("examples/.agent-device/journeys/watch.ts");
    expect(watch).toContain("ensureWatchPhonePair");
    expect(watch).toContain("watch.launchApp");
    expect(watch).toContain("watch.accessibilityTree");
    expect(watch).toContain("hasWatchWidgetVisibleProof");
  });

  test("keeps the typed driver as the only agent-device import boundary", () => {
    const journeyDirectory = path.join(
      repoRoot(),
      "examples/.agent-device/journeys",
    );
    const offenders = fs
      .readdirSync(journeyDirectory)
      .filter((name) => name.endsWith(".ts"))
      .filter((name) =>
        /from\s+["'](?:@csark0812\/)?agent-device(?:\/[^"']*)?["']/.test(
          fs.readFileSync(path.join(journeyDirectory, name), "utf8"),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
