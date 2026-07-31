export type Platform = "ios" | "android";

export type DeviceKind = "simulator" | "emulator" | "physical" | "cloud";

export type LaunchOptions = {
  platform: Platform;
  /** Device name (e.g. "iPhone 16") or UDID/serial. */
  device?: string;
  /** Explicit device id (UDID / serial). Takes precedence over device name. */
  deviceId?: string;
  kind?: DeviceKind;
  /** Acquire PID lock for this device (default true). */
  lock?: boolean;
  /** Boot if not already running (default true). */
  boot?: boolean;
  /** IDB binary path override. */
  idbPath?: string;
  /** adb binary path override. */
  adbPath?: string;
};

export type ScreenshotOptions = {
  path?: string;
  type?: "png" | "jpeg";
};

export type RecordVideoOptions = {
  path?: string;
  codec?: "h264" | "hevc";
  /** Optional auto-SIGINT; omit = unbounded. */
  maxSeconds?: number;
};

export type ViewRecordingOptions = {
  /** Default: last stopped recording on this session. */
  path?: string;
  /** Default 10. */
  fps?: number;
  /** Default 60. */
  maxFrames?: number;
  /** Inclusive window start (seconds from video start). Default 0. */
  startSeconds?: number;
  /** Exclusive-ish window end (seconds from video start). Default: full duration. */
  endSeconds?: number;
};

export type RecordingHandle = {
  path: string;
  startedAt: number;
};

export type ExtractedFrame = {
  path: string;
  /** Seconds from video start. */
  t: number;
};

export type ViewRecordingResult = {
  path: string;
  duration: number;
  /** Resolved sample window (seconds from video start). */
  startSeconds: number;
  endSeconds: number;
  frameCount: number;
  fps: number;
  maxFrames: number;
  thinned: boolean;
  frames: ExtractedFrame[];
  /** Temp dir holding frame files — delete after MCP encode. */
  outDir: string;
};

export type SwipeOptions = {
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  duration?: number;
  delta?: number;
};

export type TapOptions = {
  x: number;
  y: number;
  duration?: number;
};

export type AccessibilityNode = {
  type?: string;
  label?: string;
  value?: string;
  identifier?: string;
  frame?: { x: number; y: number; width: number; height: number };
  children?: AccessibilityNode[];
  raw?: unknown;
};

export type FindCriteria = {
  search: string[];
  type?: string;
  matchMode?: "substring" | "exact";
  caseSensitive?: boolean;
};

export type DoctorCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

export type TraceStep = {
  at: string;
  action: string;
  detail?: Record<string, unknown>;
  error?: string;
};

/** Driver contract — sim/emulator/physical/cloud adapters implement this. */
export interface DeviceDriver {
  readonly platform: Platform;
  readonly deviceId: string;
  readonly kind: DeviceKind;

  boot?(): Promise<void>;
  install(appPath: string): Promise<void>;
  launchApp(
    bundleId: string,
    options?: { terminateRunning?: boolean },
  ): Promise<void>;
  terminateApp?(bundleId: string): Promise<void>;
  screenshot(options?: ScreenshotOptions): Promise<Buffer | string>;
  startRecording(options?: RecordVideoOptions): Promise<RecordingHandle>;
  stopRecording(): Promise<string>;
  accessibilityTree(): Promise<AccessibilityNode[]>;
  describePoint?(x: number, y: number): Promise<AccessibilityNode | null>;
  findElements(criteria: FindCriteria): Promise<AccessibilityNode[]>;
  tap(options: TapOptions): Promise<void>;
  type(text: string): Promise<void>;
  swipe(options: SwipeOptions): Promise<void>;
  close?(): Promise<void>;
}
