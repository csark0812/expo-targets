import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Locator, type LocatorOptions } from "./locator";
import type { LockHandle } from "./lock";
import {
  DEFAULT_MAX_FRAMES,
  DEFAULT_VIEW_FPS,
  extractFrames,
} from "./media/frames";
import type {
  AccessibilityNode,
  DeviceDriver,
  DeviceKind,
  FindCriteria,
  Platform,
  PressButtonOptions,
  PressKeyOptions,
  RecordVideoOptions,
  RecordingAction,
  RecordingHandle,
  ScreenshotOptions,
  StopRecordingResult,
  SwipeOptions,
  TapOptions,
  TraceStep,
  ViewRecordingOptions,
  ViewRecordingResult,
} from "./types";

function siblingActionsPath(videoPath: string): string {
  const ext = path.extname(videoPath);
  const stem = ext ? videoPath.slice(0, -ext.length) : videoPath;
  return `${stem}.actions.json`;
}

export class DeviceSession {
  readonly platform: Platform;
  readonly deviceId: string;
  readonly kind: DeviceKind;
  private readonly driver: DeviceDriver;
  private readonly lock?: LockHandle;
  private readonly steps: TraceStep[] = [];
  private closed = false;
  private lastRecordingPath: string | undefined;

  /** Act journal — only while a recording is active (DW/idb-driven actions). */
  private recordingActive = false;
  private recordingStartedAt: number | null = null;
  private actionsBuffer: RecordingAction[] = [];
  private lastStopResult: StopRecordingResult | null = null;
  private actJournalFinalized = false;

  constructor(options: { driver: DeviceDriver; lock?: LockHandle }) {
    this.driver = options.driver;
    this.lock = options.lock;
    this.platform = options.driver.platform;
    this.deviceId = options.driver.deviceId;
    this.kind = options.driver.kind;
    this.driver.setOnRecordingEnded?.((videoPath, reason) => {
      if (reason === "timer" || reason === "close") {
        this.finalizeActJournal(videoPath);
      }
    });
  }

  private trace(
    action: string,
    detail?: Record<string, unknown>,
    error?: string,
  ) {
    this.steps.push({
      at: new Date().toISOString(),
      action,
      detail,
      error,
    });
  }

  private actionT(): number {
    return (Date.now() - (this.recordingStartedAt ?? Date.now())) / 1000;
  }

  private emitAction(action: RecordingAction): void {
    if (!this.recordingActive || this.recordingStartedAt === null) return;
    this.actionsBuffer.push(action);
  }

  private finalizeActJournal(videoPath: string): StopRecordingResult {
    if (this.actJournalFinalized && this.lastStopResult) {
      return this.lastStopResult;
    }
    this.recordingActive = false;
    this.actJournalFinalized = true;
    const actions = [...this.actionsBuffer];
    this.actionsBuffer = [];
    this.recordingStartedAt = null;
    const actionsPath = siblingActionsPath(videoPath);
    fs.writeFileSync(
      actionsPath,
      `${JSON.stringify(actions, null, 2)}\n`,
      "utf8",
    );
    this.lastRecordingPath = videoPath;
    const result: StopRecordingResult = {
      path: videoPath,
      actionsPath,
      actions,
    };
    this.lastStopResult = result;
    return result;
  }

  getTrace(): TraceStep[] {
    return [...this.steps];
  }

  getLastRecordingPath(): string | undefined {
    return this.lastRecordingPath;
  }

  /** Test/harness: actions buffered for the current (or last unfinished) recording. */
  getRecordingActions(): RecordingAction[] {
    return [...this.actionsBuffer];
  }

  async install(appPath: string): Promise<void> {
    try {
      await this.driver.install(appPath);
      this.trace("install", { appPath });
      this.emitAction({ type: "install", appPath, t: this.actionT() });
    } catch (e) {
      const error = String(e);
      this.trace("install", { appPath }, error);
      this.emitAction({ type: "install", appPath, error, t: this.actionT() });
      throw e;
    }
  }

  async launchApp(
    bundleId: string,
    options?: { terminateRunning?: boolean },
  ): Promise<void> {
    try {
      await this.driver.launchApp(bundleId, options);
      this.trace("launchApp", { bundleId, ...options });
      this.emitAction({ type: "launchApp", bundleId, t: this.actionT() });
    } catch (e) {
      const error = String(e);
      this.trace("launchApp", { bundleId }, error);
      this.emitAction({
        type: "launchApp",
        bundleId,
        error,
        t: this.actionT(),
      });
      throw e;
    }
  }

  async terminateApp(bundleId: string): Promise<void> {
    if (!this.driver.terminateApp) {
      throw new Error("terminateApp not supported on this driver");
    }
    try {
      await this.driver.terminateApp(bundleId);
      this.trace("terminateApp", { bundleId });
      this.emitAction({ type: "terminateApp", bundleId, t: this.actionT() });
    } catch (e) {
      const error = String(e);
      this.trace("terminateApp", { bundleId }, error);
      this.emitAction({
        type: "terminateApp",
        bundleId,
        error,
        t: this.actionT(),
      });
      throw e;
    }
  }

  async screenshot(options?: ScreenshotOptions): Promise<Buffer | string> {
    const result = await this.driver.screenshot(options);
    this.trace("screenshot", {
      path: typeof result === "string" ? result : options?.path,
    });
    return result;
  }

  async startRecording(options?: RecordVideoOptions): Promise<RecordingHandle> {
    this.actionsBuffer = [];
    this.actJournalFinalized = false;
    this.lastStopResult = null;
    const handle = await this.driver.startRecording(options);
    this.recordingStartedAt = handle.startedAt;
    this.recordingActive = true;
    this.trace("startRecording", {
      path: handle.path,
      maxSeconds: options?.maxSeconds,
    });
    return handle;
  }

  async stopRecording(): Promise<StopRecordingResult> {
    const saved = await this.driver.stopRecording();
    const result = this.finalizeActJournal(saved);
    this.trace("stopRecording", {
      path: result.path,
      actionsPath: result.actionsPath,
      actionCount: result.actions.length,
    });
    return result;
  }

  async viewRecording(
    options: ViewRecordingOptions = {},
  ): Promise<ViewRecordingResult> {
    const videoPath = options.path ?? this.lastRecordingPath;
    if (!videoPath) {
      throw new Error(
        "no recording path: pass path or stop_recording first on this session",
      );
    }
    const fps = options.fps ?? DEFAULT_VIEW_FPS;
    const maxFrames = options.maxFrames ?? DEFAULT_MAX_FRAMES;
    const outDir = path.join(
      os.tmpdir(),
      `devicewright-frames-${this.deviceId}-${Date.now()}`,
    );
    const extracted = extractFrames(videoPath, {
      fps,
      maxFrames,
      outDir,
      startSeconds: options.startSeconds,
      endSeconds: options.endSeconds,
    });
    this.trace("viewRecording", {
      path: videoPath,
      frameCount: extracted.frames.length,
      thinned: extracted.thinned,
      duration: extracted.duration,
      startSeconds: extracted.startSeconds,
      endSeconds: extracted.endSeconds,
    });
    return {
      path: videoPath,
      duration: extracted.duration,
      startSeconds: extracted.startSeconds,
      endSeconds: extracted.endSeconds,
      frameCount: extracted.frames.length,
      fps: extracted.fps,
      maxFrames: extracted.maxFrames,
      thinned: extracted.thinned,
      frames: extracted.frames,
      outDir: extracted.outDir,
    };
  }

  async accessibilityTree(): Promise<AccessibilityNode[]> {
    return this.driver.accessibilityTree();
  }

  async describePoint(x: number, y: number): Promise<AccessibilityNode | null> {
    if (!this.driver.describePoint) {
      throw new Error("describePoint not supported on this driver");
    }
    return this.driver.describePoint(x, y);
  }

  async findElements(criteria: FindCriteria): Promise<AccessibilityNode[]> {
    return this.driver.findElements(criteria);
  }

  async tap(options: TapOptions): Promise<void> {
    try {
      await this.driver.tap(options);
      this.trace("tap", options as unknown as Record<string, unknown>);
      this.emitAction({
        type: "tap",
        x: options.x,
        y: options.y,
        t: this.actionT(),
        ...(options.duration !== undefined
          ? { duration: options.duration }
          : {}),
      });
    } catch (e) {
      const error = String(e);
      this.trace("tap", options as unknown as Record<string, unknown>, error);
      this.emitAction({
        type: "tap",
        x: options.x,
        y: options.y,
        t: this.actionT(),
        ...(options.duration !== undefined
          ? { duration: options.duration }
          : {}),
        error,
      });
      throw e;
    }
  }

  async type(text: string): Promise<void> {
    try {
      await this.driver.type(text);
      this.trace("type", { length: text.length });
      this.emitAction({ type: "type", text, t: this.actionT() });
    } catch (e) {
      const error = String(e);
      this.trace("type", { length: text.length }, error);
      this.emitAction({ type: "type", text, error, t: this.actionT() });
      throw e;
    }
  }

  async swipe(options: SwipeOptions): Promise<void> {
    try {
      await this.driver.swipe(options);
      this.trace("swipe", options as unknown as Record<string, unknown>);
      this.emitAction({
        type: "swipe",
        xStart: options.xStart,
        yStart: options.yStart,
        xEnd: options.xEnd,
        yEnd: options.yEnd,
        t: this.actionT(),
        ...(options.duration !== undefined
          ? { duration: options.duration }
          : {}),
      });
    } catch (e) {
      const error = String(e);
      this.trace("swipe", options as unknown as Record<string, unknown>, error);
      this.emitAction({
        type: "swipe",
        xStart: options.xStart,
        yStart: options.yStart,
        xEnd: options.xEnd,
        yEnd: options.yEnd,
        t: this.actionT(),
        ...(options.duration !== undefined
          ? { duration: options.duration }
          : {}),
        error,
      });
      throw e;
    }
  }

  async pressKey(options: PressKeyOptions): Promise<void> {
    if (!this.driver.pressKey) {
      throw new Error("pressKey not supported on this driver");
    }
    try {
      await this.driver.pressKey(options);
      this.trace("pressKey", options as unknown as Record<string, unknown>);
      this.emitAction({
        type: "press_key",
        key: options.key,
        t: this.actionT(),
      });
    } catch (e) {
      const error = String(e);
      this.trace(
        "pressKey",
        options as unknown as Record<string, unknown>,
        error,
      );
      this.emitAction({
        type: "press_key",
        key: options.key,
        error,
        t: this.actionT(),
      });
      throw e;
    }
  }

  async pressButton(options: PressButtonOptions): Promise<void> {
    if (!this.driver.pressButton) {
      throw new Error("pressButton not supported on this driver");
    }
    try {
      await this.driver.pressButton(options);
      this.trace("pressButton", options as unknown as Record<string, unknown>);
      this.emitAction({
        type: "press_button",
        button: String(options.button),
        t: this.actionT(),
      });
    } catch (e) {
      const error = String(e);
      this.trace(
        "pressButton",
        options as unknown as Record<string, unknown>,
        error,
      );
      this.emitAction({
        type: "press_button",
        button: String(options.button),
        error,
        t: this.actionT(),
      });
      throw e;
    }
  }

  async shake(): Promise<void> {
    if (!this.driver.shake) {
      throw new Error("shake not supported on this driver");
    }
    try {
      await this.driver.shake();
      this.trace("shake");
      this.emitAction({ type: "shake", t: this.actionT() });
    } catch (e) {
      const error = String(e);
      this.trace("shake", undefined, error);
      this.emitAction({ type: "shake", error, t: this.actionT() });
      throw e;
    }
  }

  getByText(
    text: string,
    options?: LocatorOptions & { exact?: boolean },
  ): Locator {
    return new Locator(
      this,
      {
        search: [text],
        matchMode: options?.exact ? "exact" : "substring",
      },
      options,
    );
  }

  getByRole(
    role: string,
    options?: LocatorOptions & { name?: string },
  ): Locator {
    return new Locator(
      this,
      {
        type: role,
        search: options?.name ? [options.name] : [""],
        matchMode: "substring",
      },
      options,
    );
  }

  getById(id: string, options?: LocatorOptions): Locator {
    return new Locator(this, { search: [id], matchMode: "exact" }, options);
  }

  getByLabel(label: string, options?: LocatorOptions): Locator {
    return this.getByText(label, options);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      await this.driver.close?.();
      // If driver closed an active recording, callback already finalized.
      // If somehow still open without a path, drop the buffer.
      if (this.recordingActive) {
        this.recordingActive = false;
        this.actionsBuffer = [];
        this.recordingStartedAt = null;
      }
    } finally {
      this.lock?.release();
      this.trace("close");
    }
  }
}
