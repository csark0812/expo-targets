import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  scanTargetsDirectory,
  withTargetsMetro,
} from "../../../packages/expo-targets/metro/src/withTargetsMetro";

function makeTempProject(
  entries: {
    dir: string;
    config: Record<string, unknown>;
    entryFile?: string;
  }[],
): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "expo-targets-metro-"));
  for (const item of entries) {
    const targetDir = path.join(root, "targets", item.dir);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, "expo-target.config.json"),
      JSON.stringify(item.config, null, 2),
    );
    if (item.entryFile) {
      const entryPath = path.join(root, item.entryFile);
      fs.mkdirSync(path.dirname(entryPath), { recursive: true });
      fs.writeFileSync(
        entryPath,
        "export default function App() { return null }",
      );
    }
  }
  return root;
}

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("scanTargetsDirectory", () => {
  test("maps valid entry paths to absolute files", () => {
    const root = makeTempProject([
      {
        dir: "share-content",
        config: {
          type: "share",
          name: "ShareContent",
          entry: "./targets/share-content/index.tsx",
        },
        entryFile: "targets/share-content/index.tsx",
      },
    ]);
    tempRoots.push(root);

    const { entryMap, warnings } = scanTargetsDirectory(root);
    expect(warnings).toEqual([]);
    expect(entryMap.get("targets/share-content/index")).toBe(
      path.join(root, "targets/share-content/index.tsx"),
    );
  });

  test("warns when entry file is missing", () => {
    const root = makeTempProject([
      {
        dir: "broken",
        config: {
          type: "share",
          name: "Broken",
          entry: "./targets/broken/missing.tsx",
        },
      },
    ]);
    tempRoots.push(root);

    const { entryMap, warnings } = scanTargetsDirectory(root);
    expect(entryMap.size).toBe(0);
    expect(warnings.some((w) => w.includes("does not exist"))).toBe(true);
  });

  test("skips targets without entry", () => {
    const root = makeTempProject([
      {
        dir: "stickers",
        config: { type: "stickers", name: "Stickers" },
      },
    ]);
    tempRoots.push(root);

    const { entryMap, warnings } = scanTargetsDirectory(root);
    expect(entryMap.size).toBe(0);
    expect(warnings).toEqual([]);
  });
});

describe("withTargetsMetro", () => {
  test("resolveRequest returns mapped entry files", () => {
    const root = makeTempProject([
      {
        dir: "share-content",
        config: {
          type: "share",
          name: "ShareContent",
          entry: "./targets/share-content/index.tsx",
        },
        entryFile: "targets/share-content/index.tsx",
      },
    ]);
    tempRoots.push(root);

    const config = withTargetsMetro({ resolver: {} } as any, {
      projectRoot: root,
      silent: true,
    });

    const result = config.resolver!.resolveRequest!(
      {
        resolveRequest: () => ({ type: "sourceFile", filePath: "/fallback" }),
      } as any,
      "targets/share-content/index",
      "ios",
    );

    expect(result).toEqual({
      type: "sourceFile",
      filePath: path.join(root, "targets/share-content/index.tsx"),
    });
  });
});
