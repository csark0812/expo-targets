import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

/**
 * Fail if user docs reintroduce fake keyed setters on Target
 * (`target.set` / `widget.set`). Real API: setData / storage.set.
 */
const GUARDED = ["docs/api.md", "docs/widgets.md"] as const;

const FAKE_SETTER =
  /\b(?:target|widget)\.set\s*\(/;

describe("docs-guard: no fake Target.set / widget.set", () => {
  for (const rel of GUARDED) {
    test(`${rel} does not teach target.set( / widget.set(`, () => {
      const abs = path.join(process.cwd(), rel);
      const body = fs.readFileSync(abs, "utf8");
      const hits = body
        .split("\n")
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => FAKE_SETTER.test(line));
      expect(hits).toEqual([]);
    });
  }
});
