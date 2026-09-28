import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "./root";

function repositoryFiles(root: string): string[] {
  const result = spawnSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr || "git ls-files failed");
  return result.stdout
    .split("\0")
    .filter(Boolean)
    .filter((relative) => fs.existsSync(path.join(root, relative)));
}

function activeText(relative: string, content: string): string {
  if (relative === ".gitignore") {
    return content
      .split("\n")
      .filter(
        (line) =>
          !line.includes("Legacy Devicewright proof") &&
          !line.includes("examples/.devicewright/artifacts"),
      )
      .join("\n");
  }
  if (relative === "docs/limits.md") {
    return content.replace(
      /\.\.\/examples\/\.devicewright\/artifacts\/[A-Za-z0-9_./-]+/g,
      "<legacy-artifact>",
    );
  }
  return content;
}

describe("Devicewright replacement guard", () => {
  test("uses structured failures at every active journey boundary", () => {
    const journeys = path.join(repoRoot(), "examples/.agent-device/journeys");
    const offenders = fs
      .readdirSync(journeys)
      .filter((name) => name.endsWith(".ts") && name !== "helpers.ts")
      .filter((name) => {
        const content = fs.readFileSync(path.join(journeys, name), "utf8");
        return (
          /const failureKind\s*=/.test(content) ||
          /status:\s*failureKind/.test(content) ||
          /\/not installed[^/]*\/i?\.test\(/.test(content)
        );
      });
    expect(offenders).toEqual([]);
  });

  test("has no active dependency, script, import, auth, or current suite reference", () => {
    const root = repoRoot();
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.devDependencies?.["@csark0812/devicewright"]).toBeUndefined();
    expect(pkg.scripts?.["examples:agent-device:ios:matrix"]).toContain(
      "--platform=ios --live-through=5 --no-fail-fast",
    );
    expect(pkg.scripts?.["examples:agent-device:android:matrix"]).toContain(
      "--platform=android",
    );
    expect(Object.keys(pkg.scripts ?? {}).some((name) => /devicewright/i.test(name))).toBe(false);
    expect(Object.values(pkg.scripts ?? {}).some((value) => /\.devicewright|devicewright/i.test(value))).toBe(false);
    expect(fs.existsSync(path.join(root, ".npmrc"))).toBe(false);

    const activeFiles = repositoryFiles(root).filter(
      (relative) =>
        relative !== "examples/.agent-device/migration-guard.test.ts" &&
        !relative.startsWith("examples/.devicewright/artifacts/") &&
        !/(^|\/)CHANGELOG[^/]*$/i.test(relative),
    );
    const offenders = activeFiles.filter((relative) => {
      const file = path.join(root, relative);
      if (fs.statSync(file).size > 2_000_000) return false;
      const content = activeText(relative, fs.readFileSync(file, "utf8"));
      return (
        /@csark0812\/devicewright|DEVICEWRIGHT_|examples\/\.devicewright|\bdevicewright\b/i.test(
          content,
        ) || (!content.includes("\0") && /\bDW\b/.test(content))
      );
    });
    expect(offenders).toEqual([]);
  });

  test("pins the reviewed public fork release and matching lock integrity", () => {
    const root = repoRoot();
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      devDependencies?: Record<string, string>;
    };
    const provenance = JSON.parse(
      fs.readFileSync(path.join(root, "examples/.agent-device/fork-provenance.json"), "utf8"),
    ) as {
      fork: {
        publishedVersion: string;
        tarballUrl: string;
        integrity: string;
        publishStatus: string;
      };
    };
    expect(pkg.devDependencies?.["agent-device"]).toBe(provenance.fork.tarballUrl);
    expect(provenance.fork.publishedVersion).toBe("0.21.15-et.1");
    expect(provenance.fork.publishStatus).toBe("public-github-release");
    const lock = fs.readFileSync(path.join(root, "bun.lock"), "utf8");
    expect(lock).toContain(provenance.fork.tarballUrl);
    expect(lock).toContain(provenance.fork.integrity);
  });

  test("retains the historical proof directory as read-only legacy evidence", () => {
    const legacy = path.join(repoRoot(), "examples/.devicewright");
    expect(fs.existsSync(path.join(legacy, "artifacts"))).toBe(true);
    const nonArtifactFiles = repositoryFiles(repoRoot()).filter(
      (relative) =>
        relative.startsWith("examples/.devicewright/") &&
        !relative.startsWith("examples/.devicewright/artifacts/"),
    );
    expect(nonArtifactFiles).toEqual([]);
  });
});
