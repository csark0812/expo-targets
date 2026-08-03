/**
 * Local HTTP fixture for content-blocker Safari proof.
 * iOS Simulator reaches the Mac via 127.0.0.1 (shared loopback).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { repoRoot } from "../root";

export const FIXTURE_PAGE_OK = "ET_PAGE_OK";
export const FIXTURE_AD_HIDDEN = "ET_AD_SHOULD_HIDE";
export const FIXTURE_CONTROL = "ET_CONTROL_VISIBLE";

export type ContentBlockerFixture = {
  url: string;
  close: () => Promise<void>;
};

/** Serve fixtures/content-blocker/index.html on 127.0.0.1:<ephemeral>. */
export async function startContentBlockerFixture(): Promise<ContentBlockerFixture> {
  const htmlPath = path.join(
    repoRoot(),
    "examples/.devicewright/fixtures/content-blocker/index.html",
  );
  const html = fs.readFileSync(htmlPath, "utf8");
  const server = http.createServer((req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(html);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  if (!addr || typeof addr === "string") {
    server.close();
    throw new Error("content-blocker fixture: failed to bind ephemeral port");
  }

  return {
    url: `http://127.0.0.1:${addr.port}/`,
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}

/**
 * Web content is opaque to idb AX; Maestro hierarchy sees the fixture markers.
 */
export function assertFixtureViaMaestro(
  udid: string,
  steps: string[],
): { ok: boolean; detail: string } {
  const yaml = path.join(
    repoRoot(),
    "examples/.devicewright/fixtures/content-blocker/assert-css.yaml",
  );
  const maestro =
    process.env.MAESTRO_BIN ||
    (fs.existsSync(`${process.env.HOME}/.maestro/bin/maestro`)
      ? `${process.env.HOME}/.maestro/bin/maestro`
      : "maestro");
  const r = spawnSync(maestro, ["test", "--device", udid, yaml], {
    encoding: "utf8",
    env: process.env,
    timeout: 90_000,
  });
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  if (r.status === 0) {
    steps.push("fixture-maestro-ok");
    return { ok: true, detail: "maestro assert-css passed" };
  }
  steps.push(`fixture-maestro-fail:${(out || "exit").slice(0, 120)}`);
  return {
    ok: false,
    detail: out.trim().slice(0, 400) || `maestro exited ${r.status}`,
  };
}
