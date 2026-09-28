import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hashInstalledBundle } from "./release-builds";

const created: string[] = [];

afterEach(() => {
  for (const directory of created.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("Release build inventory", () => {
  test("hashes an installed bundle deterministically and detects content changes", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "expo-targets-app-bundle-"));
    created.push(root);
    fs.mkdirSync(path.join(root, "Frameworks"));
    fs.writeFileSync(path.join(root, "Info.plist"), "first");
    fs.writeFileSync(path.join(root, "Frameworks", "runtime"), "runtime");

    const first = hashInstalledBundle(root);
    expect(hashInstalledBundle(root)).toBe(first);
    expect(first).toHaveLength(64);

    fs.writeFileSync(path.join(root, "Info.plist"), "second");
    expect(hashInstalledBundle(root)).not.toBe(first);
  });
});
