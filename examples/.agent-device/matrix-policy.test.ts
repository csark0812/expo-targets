import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { normalizeResults } from "./matrix";
import { REQUIRED_V2 } from "./required";
import { hasWatchWidgetVisibleProof } from "./journeys/watch";
import { repoRoot } from "./root";

const row = REQUIRED_V2.find((candidate) => candidate.id === "native-share")!;

describe("agent-device matrix status policy", () => {
  test("rejects a green made only from soft evidence", () => {
    const [result] = normalizeResults(
      [row],
      [{ id: row.id, ok: true, status: "green", steps: ["launch-host", "pm-path"] }],
      "android",
    );
    expect(result?.status).toBe("red");
    expect(result?.error).toContain("soft-green");
  });

  test("rejects an os-limit made from an empty surface", () => {
    const [result] = normalizeResults(
      [row],
      [{ id: row.id, ok: false, status: "os-limit", steps: ["launch-host"] }],
      "android",
    );
    expect(result?.status).toBe("red");
    expect(result?.error).toContain("empty-surface");
  });

  test("rejects an unapproved os-limit", () => {
    const [result] = normalizeResults(
      [row],
      [{ id: row.id, ok: false, status: "os-limit", steps: ["attempted-locked-p"] }],
      "android",
    );
    expect(result?.status).toBe("red");
    expect(result?.error).toContain("os-limit");
  });

  test("does not treat watch installation or launch as visible widget proof", () => {
    expect(
      hasWatchWidgetVisibleProof({
        nested: true,
        companionChrome: false,
        stackMarker: false,
      }),
    ).toBe(false);
    expect(
      hasWatchWidgetVisibleProof({
        nested: true,
        companionChrome: true,
        stackMarker: false,
      }),
    ).toBe(true);
  });

  test("does not expose a host-only os-limit escape hatch", () => {
    const source = fs.readFileSync(
      path.join(
        repoRoot(),
        "examples/.agent-device/journeys/pluginkit-os-limit.ts",
      ),
      "utf8",
    );
    expect(source).not.toContain("hostOnly");
    expect(source).not.toContain("host-only-os-limit");
  });
});
