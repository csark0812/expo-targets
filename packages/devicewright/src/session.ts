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
  RecordVideoOptions,
  RecordingHandle,
  ScreenshotOptions,
  SwipeOptions,
  TapOptions,
  TraceStep,
  ViewRecordingOptions,
  ViewRecordingResult,
} from "./types";

export class DeviceSession {
  readonly platform: Platform;
  readonly deviceId: string;
  readonly kind: DeviceKind;
  private readonly driver: DeviceDriver;
  private readonly lock?: LockHandle;
  private readonly steps: TraceStep[] = [];
  private closed = false;
  private lastRecordingPath: string | undefined;

  constructor(options: { driver: DeviceDriver; lock?: LockHandle }) {
    this.driver = options.driver;
    this.lock = options.lock;
    this.platform = options.driver.platform;
    this.deviceId = options.driver.deviceId;
    this.kind = options.driver.kind;
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

  getTrace(): TraceStep[] {
    return [...this.steps];
  }

  getLastRecordingPath(): string | undefined {
    return this.lastRecordingPath;
  }

  async install(appPath: string): Promise<void> {
    try {
      await this.driver.install(appPath);
      this.trace("install", { appPath });
    } catch (e) {
      this.trace("install", { appPath }, String(e));
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
    } catch (e) {
      this.trace("launchApp", { bundleId }, String(e));
      throw e;
    }
  }

  async terminateApp(bundleId: string): Promise<void> {
    if (!this.driver.terminateApp) {
      throw new Error("terminateApp not supported on this driver");
    }
    await this.driver.terminateApp(bundleId);
    this.trace("terminateApp", { bundleId });
  }

  async screenshot(options?: ScreenshotOptions): Promise<Buffer | string> {
    const result = await this.driver.screenshot(options);
    this.trace("screenshot", {
      path: typeof result === "string" ? result : options?.path,
    });
    return result;
  }

  async startRecording(options?: RecordVideoOptions): Promise<RecordingHandle> {
    const handle = await this.driver.startRecording(options);
    this.trace("startRecording", {
      path: handle.path,
      maxSeconds: options?.maxSeconds,
    });
    return handle;
  }

  async stopRecording(): Promise<string> {
    const saved = await this.driver.stopRecording();
    this.lastRecordingPath = saved;
    this.trace("stopRecording", { path: saved });
    return saved;
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
    await this.driver.tap(options);
    this.trace("tap", options as unknown as Record<string, unknown>);
  }

  async type(text: string): Promise<void> {
    await this.driver.type(text);
    this.trace("type", { length: text.length });
  }

  async swipe(options: SwipeOptions): Promise<void> {
    await this.driver.swipe(options);
    this.trace("swipe", options as unknown as Record<string, unknown>);
  }

  getByText(
    text: string,
    options?: LocatorOptions & { exact?: boolean },
  ): Locator {
    return new Locator(
      this.driver,
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
      this.driver,
      {
        type: role,
        search: options?.name ? [options.name] : [""],
        matchMode: "substring",
      },
      options,
    );
  }

  getById(id: string, options?: LocatorOptions): Locator {
    return new Locator(
      this.driver,
      { search: [id], matchMode: "exact" },
      options,
    );
  }

  getByLabel(label: string, options?: LocatorOptions): Locator {
    return this.getByText(label, options);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      await this.driver.close?.();
    } finally {
      this.lock?.release();
      this.trace("close");
    }
  }
}
