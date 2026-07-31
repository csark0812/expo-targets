import type { ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { assertSafeBundleId, assertSafePath } from "../allowlist";
import type {
  AccessibilityNode,
  DeviceDriver,
  DeviceKind,
  FindCriteria,
  PressButtonOptions,
  PressKeyOptions,
  RecordVideoOptions,
  RecordingHandle,
  ScreenshotOptions,
  SwipeOptions,
  TapOptions,
} from "../types";
import * as idb from "./idb";
import * as simctl from "./simctl";

export type IosDriverOptions = {
  deviceId: string;
  kind?: DeviceKind;
  idbPath?: string;
};

type ActiveRecording = {
  child: ChildProcess;
  path: string;
  startedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
  finalized: boolean;
};

export class IosDriver implements DeviceDriver {
  readonly platform = "ios" as const;
  readonly deviceId: string;
  readonly kind: DeviceKind;
  private readonly idbPath?: string;
  private recording: ActiveRecording | null = null;
  private lastFinalizedPath: string | null = null;
  private onRecordingEnded: ((path: string, reason: string) => void) | null =
    null;

  constructor(options: IosDriverOptions) {
    this.deviceId = options.deviceId;
    this.kind = options.kind ?? "simulator";
    this.idbPath = options.idbPath;
  }

  setOnRecordingEnded(
    cb: ((path: string, reason: string) => void) | null,
  ): void {
    this.onRecordingEnded = cb;
  }

  async boot(): Promise<void> {
    if (this.kind === "simulator") {
      simctl.bootSimulator(this.deviceId);
    }
    // physical: assume already paired / trusted
  }

  async install(appPath: string): Promise<void> {
    const app = assertSafePath(appPath, { mustExist: true });
    if (this.kind === "simulator") {
      simctl.installApp(this.deviceId, app);
      return;
    }
    throw new Error(
      "physical install via Devicewright uses usbmux/ideviceinstaller — wire in Phase 4 deepen",
    );
  }

  async launchApp(
    bundleId: string,
    options?: { terminateRunning?: boolean },
  ): Promise<void> {
    const id = assertSafeBundleId(bundleId);
    if (this.kind === "simulator") {
      simctl.launchApp(this.deviceId, id, options);
      return;
    }
    throw new Error("physical launchApp deepen in Phase 4");
  }

  async terminateApp(bundleId: string): Promise<void> {
    simctl.terminateApp(this.deviceId, assertSafeBundleId(bundleId));
  }

  async screenshot(options?: ScreenshotOptions): Promise<Buffer | string> {
    const out =
      options?.path ??
      path.join(os.tmpdir(), `devicewright-${this.deviceId}-${Date.now()}.png`);
    if (this.kind === "simulator") {
      return simctl.screenshotSim(this.deviceId, out);
    }
    throw new Error("physical screenshot deepen in Phase 4");
  }

  async startRecording(
    options: RecordVideoOptions = {},
  ): Promise<RecordingHandle> {
    if (this.kind !== "simulator") {
      throw new Error("physical recordVideo deepen in Phase 4");
    }
    if (this.recording && !this.recording.finalized) {
      throw new Error(
        `recording already in progress on ${this.deviceId}: ${this.recording.path}`,
      );
    }
    this.lastFinalizedPath = null;
    const out =
      options.path ??
      path.join(os.tmpdir(), `devicewright-${this.deviceId}-${Date.now()}.mp4`);
    const startedAt = Date.now();
    const { child, path: filePath } = simctl.recordVideoStart(
      this.deviceId,
      out,
      { codec: options.codec, force: true },
    );

    const active: ActiveRecording = {
      child,
      path: filePath,
      startedAt,
      timer: null,
      finalized: false,
    };
    this.recording = active;

    if (options.maxSeconds !== undefined) {
      if (!Number.isFinite(options.maxSeconds) || options.maxSeconds <= 0) {
        await this.finalizeRecording("error");
        throw new Error(`invalid maxSeconds: ${options.maxSeconds}`);
      }
      active.timer = setTimeout(() => {
        void this.finalizeRecording("timer");
      }, options.maxSeconds * 1000);
      active.timer.unref?.();
    }

    return { path: filePath, startedAt };
  }

  async stopRecording(): Promise<string> {
    if (!this.recording || this.recording.finalized) {
      if (this.lastFinalizedPath) return this.lastFinalizedPath;
      throw new Error("no active recording to stop");
    }
    return this.finalizeRecording("stop");
  }

  private async finalizeRecording(
    reason: "stop" | "timer" | "close" | "error",
  ): Promise<string> {
    const active = this.recording;
    if (!active) {
      if (this.lastFinalizedPath) return this.lastFinalizedPath;
      throw new Error("no active recording to stop");
    }
    if (active.finalized) {
      return active.path;
    }
    active.finalized = true;
    if (active.timer) {
      clearTimeout(active.timer);
      active.timer = null;
    }
    try {
      await simctl.stopRecording(active.child);
      if (reason !== "error") {
        simctl.assertRecordingFile(active.path);
      }
      this.lastFinalizedPath = active.path;
      return active.path;
    } finally {
      this.recording = null;
      if (reason !== "error" && this.lastFinalizedPath) {
        try {
          this.onRecordingEnded?.(this.lastFinalizedPath, reason);
        } catch {
          // session finalize must not break driver teardown
        }
      }
    }
  }

  async accessibilityTree(): Promise<AccessibilityNode[]> {
    return idb.describeAll(this.deviceId, { idbPath: this.idbPath });
  }

  async describePoint(x: number, y: number): Promise<AccessibilityNode | null> {
    return idb.describePoint({
      udid: this.deviceId,
      x,
      y,
      idbPath: this.idbPath,
    });
  }

  async findElements(criteria: FindCriteria): Promise<AccessibilityNode[]> {
    return idb.findElements(this.deviceId, criteria, { idbPath: this.idbPath });
  }

  async tap(options: TapOptions): Promise<void> {
    await idb.tap(this.deviceId, { ...options, idbPath: this.idbPath });
  }

  async type(text: string): Promise<void> {
    await idb.typeText(this.deviceId, text, { idbPath: this.idbPath });
  }

  async swipe(options: SwipeOptions): Promise<void> {
    await idb.swipe(this.deviceId, { ...options, idbPath: this.idbPath });
  }

  async pressKey(options: PressKeyOptions): Promise<void> {
    await idb.pressKey(this.deviceId, { ...options, idbPath: this.idbPath });
  }

  async pressButton(options: PressButtonOptions): Promise<void> {
    await idb.pressButton(this.deviceId, {
      ...options,
      idbPath: this.idbPath,
    });
  }

  async shake(): Promise<void> {
    if (this.kind !== "simulator") {
      throw new Error("shake is only supported on iOS Simulator");
    }
    simctl.shakeSimulator();
  }

  async viewCompressed(): Promise<Buffer> {
    const p = await this.screenshot();
    const file = typeof p === "string" ? p : null;
    if (!file) return p as Buffer;
    return fs.readFileSync(file);
  }

  async close(): Promise<void> {
    if (this.recording && !this.recording.finalized) {
      try {
        await this.finalizeRecording("close");
      } catch {
        // best-effort
      }
    }
  }
}

export * as idb from "./idb";
export * as simctl from "./simctl";
