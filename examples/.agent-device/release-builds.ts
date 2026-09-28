import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hostLaunchId, TARGET_CATALOG } from "./catalog";
import { REQUIRED_ANDROID, REQUIRED_V2, type RequiredTargetRow } from "./required";

type Platform = "ios" | "android";

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`,
    );
  }
  return result.stdout.trim();
}

function addTree(hash: ReturnType<typeof createHash>, root: string, relative = ""): void {
  const absolute = relative ? path.join(root, relative) : root;
  const stat = fs.lstatSync(absolute);
  const normalized = relative.split(path.sep).join("/");
  if (stat.isSymbolicLink()) {
    hash.update(`link\0${normalized}\0${fs.readlinkSync(absolute)}\0`);
    return;
  }
  if (stat.isDirectory()) {
    hash.update(`directory\0${normalized}\0`);
    for (const name of fs.readdirSync(absolute).sort()) {
      addTree(hash, root, relative ? path.join(relative, name) : name);
    }
    return;
  }
  if (!stat.isFile()) {
    throw new Error(`unsupported installed bundle entry: ${absolute}`);
  }
  hash.update(`file\0${normalized}\0${stat.mode & 0o111 ? "executable" : "plain"}\0`);
  hash.update(fs.readFileSync(absolute));
  hash.update("\0");
}

/** Deterministic content digest for an installed .app bundle. */
export function hashInstalledBundle(bundlePath: string): string {
  const hash = createHash("sha256");
  addTree(hash, bundlePath);
  return hash.digest("hex");
}

function iosBundleDigest(device: string, bundleId: string): string {
  const bundlePath = run("xcrun", [
    "simctl",
    "get_app_container",
    device,
    bundleId,
    "app",
  ]);
  return hashInstalledBundle(bundlePath);
}

function androidPackageDigest(device: string, packageId: string): string {
  const apkPaths = run("adb", ["-s", device, "shell", "pm", "path", packageId])
    .split("\n")
    .map((line) => line.trim().replace(/^package:/, ""))
    .filter(Boolean);
  if (apkPaths.length === 0) {
    throw new Error(`no installed APKs found for ${packageId} on ${device}`);
  }
  const entries = apkPaths.map((apkPath) => {
    const output = run("adb", ["-s", device, "shell", "sha256sum", apkPath]);
    const sha256 = output.split(/\s+/)[0];
    if (!sha256 || !/^[0-9a-f]{64}$/i.test(sha256)) {
      throw new Error(`invalid sha256sum output for ${packageId}: ${output}`);
    }
    return `${path.posix.basename(apkPath)}:${sha256.toLowerCase()}`;
  });
  return createHash("sha256").update(entries.sort().join("\n")).digest("hex");
}

export function captureReleaseBuildManifest(options: {
  platform: Platform;
  device: string;
  gitSha?: string;
  rows?: readonly RequiredTargetRow[];
}): {
  schemaVersion: 1;
  platform: Platform;
  gitSha: string;
  workingTreeDirty: false;
  builds: Array<{ id: string; sha256: string }>;
} {
  const rows = options.rows ?? (options.platform === "android" ? REQUIRED_ANDROID : REQUIRED_V2);
  const gitSha = options.gitSha ?? run("git", ["rev-parse", "HEAD"]);
  if (!options.gitSha) {
    const status = run("git", ["status", "--porcelain", "--untracked-files=all"]);
    if (status.length > 0) {
      throw new Error(
        "release-build manifest requires a clean working tree so installed binaries can bind to an exact commit",
      );
    }
  }
  const digests = new Map<string, string>();
  const builds = rows.map((row) => {
    const entry = TARGET_CATALOG[row.id];
    if (!entry) throw new Error(`missing catalog entry for ${row.id}`);
    const launchId = hostLaunchId(entry, options.platform);
    let sha256 = digests.get(launchId);
    if (!sha256) {
      sha256 =
        options.platform === "ios"
          ? iosBundleDigest(options.device, launchId)
          : androidPackageDigest(options.device, launchId);
      digests.set(launchId, sha256);
    }
    return { id: row.id, sha256 };
  });
  return {
    schemaVersion: 1,
    platform: options.platform,
    gitSha,
    workingTreeDirty: false,
    builds,
  };
}

export function writeReleaseBuildManifest(options: {
  platform: Platform;
  device: string;
  output: string;
}): void {
  const manifest = captureReleaseBuildManifest(options);
  fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
  fs.writeFileSync(path.resolve(options.output), `${JSON.stringify(manifest, null, 2)}\n`);
}
