import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Locator } from "./locator";
import { DeviceSession } from "./session";
import type {
  AccessibilityNode,
  DeviceDriver,
  FindCriteria,
  RecordingHandle,
  TapOptions,
} from "./types";

function fakeDriver(nodes: AccessibilityNode[]): DeviceDriver & {
  taps: TapOptions[];
  recordingEnded?: (path: string, reason: string) => void;
} {
  const taps: TapOptions[] = [];
  let onEnded: ((path: string, reason: string) => void) | null = null;
  let recording: RecordingHandle | null = null;
  const videoPath = path.join(
    os.tmpdir(),
    `devicewright-test-${Date.now()}.mp4`,
  );

  return {
    platform: "ios",
    deviceId: "fake",
    kind: "simulator",
    taps,
    async install() {},
    async launchApp() {},
    async terminateApp() {},
    async screenshot() {
      return Buffer.from("");
    },
    setOnRecordingEnded(cb) {
      onEnded = cb;
    },
    async startRecording() {
      recording = { path: videoPath, startedAt: Date.now() };
      return recording;
    },
    async stopRecording() {
      if (!recording) throw new Error("no active recording to stop");
      const p = recording.path;
      fs.writeFileSync(p, "fake");
      recording = null;
      onEnded?.(p, "stop");
      return p;
    },
    async accessibilityTree() {
      return nodes;
    },
    async findElements(criteria: FindCriteria) {
      return nodes.filter((n) =>
        criteria.search.some((s) => (n.label ?? "").includes(s)),
      );
    },
    async tap(options: TapOptions) {
      taps.push(options);
    },
    async type() {},
    async swipe() {},
    async pressKey() {},
    async pressButton() {},
    async shake() {},
    async close() {
      if (recording) {
        const p = recording.path;
        fs.writeFileSync(p, "fake");
        recording = null;
        onEnded?.(p, "close");
      }
    },
  };
}

describe("Locator", () => {
  test("taps center of matching frame via host.tap", async () => {
    const taps: TapOptions[] = [];
    const host = {
      async findElements(criteria: FindCriteria) {
        return [
          {
            type: "Button",
            label: "Share",
            frame: { x: 10, y: 20, width: 100, height: 40 },
          },
        ].filter((n) =>
          criteria.search.some((s) => (n.label ?? "").includes(s)),
        );
      },
      async tap(o: TapOptions) {
        taps.push(o);
      },
    };
    const loc = new Locator(host, { search: ["Share"] }, { timeoutMs: 500 });
    await loc.tap();
    expect(taps[0]).toEqual({ x: 60, y: 40 });
  });

  test("times out when missing", async () => {
    const loc = new Locator(
      {
        async findElements() {
          return [];
        },
        async tap() {},
      },
      { search: ["Nope"] },
      { timeoutMs: 200, intervalMs: 50 },
    );
    await expect(loc.tap()).rejects.toThrow(/locator timeout/);
  });
});

describe("recording act journal", () => {
  test("buffers DW actions only while recording; monotonic t", async () => {
    const driver = fakeDriver([]);
    const session = new DeviceSession({ driver });

    await session.tap({ x: 1, y: 2 });
    expect(session.getRecordingActions()).toHaveLength(0);

    await session.startRecording();
    await session.tap({ x: 10, y: 20 });
    await session.type("hi");
    await session.swipe({
      xStart: 0,
      yStart: 0,
      xEnd: 50,
      yEnd: 50,
    });
    await session.pressKey({ key: "enter" });
    await session.pressButton({ button: "HOME" });
    await session.shake();
    await session.launchApp("com.example.app");
    const tmpApp = path.join(os.tmpdir(), "devicewright-fake.app");
    fs.mkdirSync(tmpApp, { recursive: true });
    await session.install(tmpApp);
    await session.terminateApp("com.example.app");

    const buffered = session.getRecordingActions();
    expect(buffered.map((a) => a.type)).toEqual([
      "tap",
      "type",
      "swipe",
      "press_key",
      "press_button",
      "shake",
      "launchApp",
      "install",
      "terminateApp",
    ]);
    for (let i = 1; i < buffered.length; i++) {
      expect(buffered[i]!.t).toBeGreaterThanOrEqual(buffered[i - 1]!.t);
    }

    const result = await session.stopRecording();
    expect(result.path.endsWith(".mp4")).toBe(true);
    expect(result.actionsPath).toBe(
      result.path.replace(/\.mp4$/, ".actions.json"),
    );
    expect(fs.existsSync(result.actionsPath)).toBe(true);
    const fromDisk = JSON.parse(
      fs.readFileSync(result.actionsPath, "utf8"),
    ) as unknown[];
    expect(fromDisk).toHaveLength(result.actions.length);
    expect(session.getRecordingActions()).toHaveLength(0);

    await session.tap({ x: 9, y: 9 });
    expect(session.getRecordingActions()).toHaveLength(0);

    fs.rmSync(result.path, { force: true });
    fs.rmSync(result.actionsPath, { force: true });
    fs.rmSync(tmpApp, { recursive: true, force: true });
  });

  test("Locator tap emits once through session", async () => {
    const driver = fakeDriver([
      {
        type: "Button",
        label: "Share",
        frame: { x: 10, y: 20, width: 100, height: 40 },
      },
    ]);
    const session = new DeviceSession({ driver });
    await session.startRecording();
    await session.getByText("Share", { timeoutMs: 500 }).tap();
    const actions = session.getRecordingActions();
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: "tap", x: 60, y: 40 });
    expect(driver.taps).toHaveLength(1);
    const stopped = await session.stopRecording();
    fs.rmSync(stopped.path, { force: true });
    fs.rmSync(stopped.actionsPath, { force: true });
  });

  test("failed action emits error then rethrows", async () => {
    const driver = fakeDriver([]);
    driver.tap = async () => {
      throw new Error("boom");
    };
    const session = new DeviceSession({ driver });
    await session.startRecording();
    await expect(session.tap({ x: 1, y: 1 })).rejects.toThrow(/boom/);
    const actions = session.getRecordingActions();
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      type: "tap",
      x: 1,
      y: 1,
      error: expect.stringContaining("boom"),
    });
    // stop without driver recording file — synthesize via close path
    driver.tap = async () => {};
    const stopped = await session.stopRecording();
    fs.rmSync(stopped.path, { force: true });
    fs.rmSync(stopped.actionsPath, { force: true });
  });

  test("maxSeconds timer finalizes act journal via onRecordingEnded", async () => {
    let onEnded: ((path: string, reason: string) => void) | null = null;
    const videoPath = path.join(
      os.tmpdir(),
      `devicewright-timer-${Date.now()}.mp4`,
    );
    let active: RecordingHandle | null = null;
    const driver: DeviceDriver = {
      platform: "ios",
      deviceId: "fake",
      kind: "simulator",
      async install() {},
      async launchApp() {},
      async screenshot() {
        return Buffer.from("");
      },
      setOnRecordingEnded(cb) {
        onEnded = cb;
      },
      async startRecording() {
        active = { path: videoPath, startedAt: Date.now() };
        return active;
      },
      async stopRecording() {
        throw new Error("should not call stop in timer test");
      },
      async accessibilityTree() {
        return [];
      },
      async findElements() {
        return [];
      },
      async tap() {},
      async type() {},
      async swipe() {},
    };

    const session = new DeviceSession({ driver });
    await session.startRecording();
    await session.tap({ x: 3, y: 4 });
    expect(session.getRecordingActions()).toHaveLength(1);

    fs.writeFileSync(videoPath, "fake");
    onEnded?.(videoPath, "timer");

    expect(session.getRecordingActions()).toHaveLength(0);
    expect(session.getLastRecordingPath()).toBe(videoPath);
    const actionsPath = videoPath.replace(/\.mp4$/, ".actions.json");
    expect(fs.existsSync(actionsPath)).toBe(true);
    const disk = JSON.parse(fs.readFileSync(actionsPath, "utf8")) as Array<{
      type: string;
    }>;
    expect(disk[0]?.type).toBe("tap");

    fs.rmSync(videoPath, { force: true });
    fs.rmSync(actionsPath, { force: true });
  });

  test("schema round-trip JSON", async () => {
    const driver = fakeDriver([]);
    const session = new DeviceSession({ driver });
    await session.startRecording();
    await session.tap({ x: 1, y: 2, duration: 0.1 });
    await session.type("x");
    const {
      actions,
      actionsPath,
      path: videoPath,
    } = await session.stopRecording();
    const parsed = JSON.parse(fs.readFileSync(actionsPath, "utf8"));
    expect(parsed).toEqual(actions);
    expect(actions[0]).toMatchObject({
      type: "tap",
      x: 1,
      y: 2,
      duration: 0.1,
    });
    expect(typeof actions[0]!.t).toBe("number");
    fs.rmSync(videoPath, { force: true });
    fs.rmSync(actionsPath, { force: true });
  });
});
