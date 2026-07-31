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

/** Hardware buttons supported by `idb ui button`. */
export type HardwareButton =
  | "APPLE_PAY"
  | "HOME"
  | "LOCK"
  | "SIDE_BUTTON"
  | "SIRI";

export type PressButtonOptions = {
  button: HardwareButton | string;
  duration?: number;
};

export type PressKeyOptions = {
  /** Named key (enter, delete, …) or numeric HID keycode string. */
  key: string;
  duration?: number;
};

/**
 * DW act journal row — host-schedule seconds from RecordingHandle.startedAt.
 * Co-recorded with video; not a transcript of Simulator.app mouse HID.
 */
export type RecordingAction =
  | {
      t: number;
      type: "tap";
      x: number;
      y: number;
      duration?: number;
      error?: string;
    }
  | { t: number; type: "type"; text: string; error?: string }
  | {
      t: number;
      type: "swipe";
      xStart: number;
      yStart: number;
      xEnd: number;
      yEnd: number;
      duration?: number;
      error?: string;
    }
  | { t: number; type: "press_key"; key: string; error?: string }
  | { t: number; type: "press_button"; button: string; error?: string }
  | { t: number; type: "shake"; error?: string }
  | { t: number; type: "install"; appPath: string; error?: string }
  | { t: number; type: "launchApp"; bundleId: string; error?: string }
  | { t: number; type: "terminateApp"; bundleId: string; error?: string };

export type StopRecordingResult = {
  path: string;
  actionsPath: string;
  actions: RecordingAction[];
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
  /** Path to finalized mp4. Session wraps this with the act journal. */
  stopRecording(): Promise<string>;
  /**
   * Optional: notified when recording ends (explicit stop, maxSeconds timer, or close).
   * Session uses this to finalize the act buffer when the driver auto-stops.
   */
  setOnRecordingEnded?(
    cb: ((path: string, reason: string) => void) | null,
  ): void;
  accessibilityTree(): Promise<AccessibilityNode[]>;
  describePoint?(x: number, y: number): Promise<AccessibilityNode | null>;
  findElements(criteria: FindCriteria): Promise<AccessibilityNode[]>;
  tap(options: TapOptions): Promise<void>;
  type(text: string): Promise<void>;
  swipe(options: SwipeOptions): Promise<void>;
  pressKey?(options: PressKeyOptions): Promise<void>;
  pressButton?(options: PressButtonOptions): Promise<void>;
  shake?(): Promise<void>;
  close?(): Promise<void>;
}
