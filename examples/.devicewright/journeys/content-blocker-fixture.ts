/**
 * Local HTTP fixture for content-blocker Safari proof.
 * iOS Simulator reaches the Mac via 127.0.0.1 (shared loopback).
 *
 * Page-text asserts use Devicewright assertWeb* (DW 0.1.10+), not a
 * hand-rolled Maestro YAML spawn.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { DeviceSession } from "@csark0812/devicewright";
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
 * Prove css-display-none hid the ad marker while the page/control remain.
 * Page must already be open in Safari (journey uses simctl openurl).
 */
export async function assertContentBlockerFixture(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  await device.assertWebContent({
    visible: [FIXTURE_PAGE_OK, FIXTURE_CONTROL],
    notVisible: [FIXTURE_AD_HIDDEN],
    timeoutMs: 12_000,
  });
  steps.push("fixture-dw-web-ok");
}
