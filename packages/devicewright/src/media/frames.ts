/**
 * ffmpeg/ffprobe frame extraction for ui_view_recording.
 * Structured argv only — never shell interpolation.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { assertSafeOutputPath, assertSafePath } from "../allowlist";
import { runSync } from "../exec";
import type { ExtractedFrame } from "../types";

export const DEFAULT_VIEW_FPS = 10;
export const DEFAULT_MAX_FRAMES = 60;
const MIN_VIDEO_BYTES = 64;

export type ExtractFramesOptions = {
  fps?: number;
  maxFrames?: number;
  outDir?: string;
  /** Inclusive window start (seconds from video start). Default 0. */
  startSeconds?: number;
  /** Window end (seconds from video start). Default: full duration. */
  endSeconds?: number;
};

export type ExtractFramesResult = {
  frames: ExtractedFrame[];
  duration: number;
  startSeconds: number;
  endSeconds: number;
  thinned: boolean;
  fps: number;
  maxFrames: number;
  outDir: string;
};

export function clampFps(fps: number | undefined): number {
  const n = fps ?? DEFAULT_VIEW_FPS;
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`invalid fps: ${fps}`);
  }
  return n;
}

export function clampMaxFrames(maxFrames: number | undefined): number {
  const n = maxFrames ?? DEFAULT_MAX_FRAMES;
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`invalid maxFrames: ${maxFrames}`);
  }
  return Math.floor(n);
}

/**
 * Resolve [start, end] within [0, duration]. end defaults to duration.
 * Empty / inverted windows throw.
 */
export function resolveViewWindow(
  duration: number,
  startSeconds?: number,
  endSeconds?: number,
): { start: number; end: number } {
  if (!(duration >= 0) || !Number.isFinite(duration)) {
    throw new Error(`invalid duration: ${duration}`);
  }
  const start = startSeconds ?? 0;
  const end = endSeconds ?? duration;
  if (!Number.isFinite(start) || start < 0) {
    throw new Error(`invalid startSeconds: ${startSeconds}`);
  }
  if (!Number.isFinite(end) || end < 0) {
    throw new Error(`invalid endSeconds: ${endSeconds}`);
  }
  if (start > duration) {
    throw new Error(
      `startSeconds ${start} is past duration ${duration.toFixed(3)}s`,
    );
  }
  const clampedEnd = Math.min(end, duration);
  if (clampedEnd <= start) {
    throw new Error(
      `empty view window: startSeconds=${start} endSeconds=${end} duration=${duration}`,
    );
  }
  return { start, end: clampedEnd };
}

/** Even-spacing timestamps over a span (relative 0..span). */
export function computeFrameTimestamps(
  span: number,
  fps: number,
  maxFrames: number,
): { times: number[]; thinned: boolean } {
  if (!(span > 0) || !Number.isFinite(span)) {
    return { times: [0], thinned: false };
  }
  const denseBudget = maxFrames / fps;
  if (span > denseBudget) {
    const n = maxFrames;
    if (n === 1) return { times: [0], thinned: true };
    const times = Array.from({ length: n }, (_, i) => (i * span) / (n - 1));
    return { times, thinned: true };
  }
  const times: number[] = [];
  for (let i = 0; times.length < maxFrames; i++) {
    const t = i / fps;
    if (t > span + 1e-9) break;
    times.push(t);
  }
  if (times.length === 0) times.push(0);
  return { times, thinned: false };
}

export function assertReadableVideo(videoPath: string): void {
  const resolved = assertSafePath(videoPath, { mustExist: true });
  const st = fs.statSync(resolved);
  if (!st.isFile() || st.size < MIN_VIDEO_BYTES) {
    throw new Error(
      `unreadable or empty recording: ${resolved} (size ${st.size})`,
    );
  }
}

export function probeDurationSeconds(videoPath: string): number {
  const resolved = assertSafePath(videoPath, { mustExist: true });
  const result = runSync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    resolved,
  ]);
  if (result.status !== 0) {
    throw new Error(
      `ffprobe failed for ${resolved}: ${result.stderr || result.stdout || "unknown"}`,
    );
  }
  const duration = Number.parseFloat(result.stdout.trim());
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error(`ffprobe returned invalid duration: ${result.stdout}`);
  }
  return duration;
}

/** Keep -ss off EOF so simctl HEVC still yields a frame. */
export function clampSeekTime(t: number, duration: number): number {
  if (!(duration > 0) || !Number.isFinite(duration)) return 0;
  if (!Number.isFinite(t) || t <= 0) return 0;
  const maxSeek = Math.max(0, duration - 0.05);
  return Math.min(t, maxSeek);
}

function extractOneFrame(videoPath: string, t: number, outPath: string): void {
  const result = runSync("ffmpeg", [
    "-y",
    "-ss",
    String(t),
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    // ffmpeg 8 image2: single-file output needs -update 1
    "-update",
    "1",
    outPath,
  ]);
  if (result.status !== 0 || !fs.existsSync(outPath)) {
    throw new Error(
      `ffmpeg frame extract failed at t=${t}: ${
        result.stderr || result.stdout || "unknown"
      }`,
    );
  }
}

export function extractFrames(
  videoPath: string,
  options: ExtractFramesOptions = {},
): ExtractFramesResult {
  assertReadableVideo(videoPath);
  const resolved = assertSafePath(videoPath, { mustExist: true });
  const fps = clampFps(options.fps);
  const maxFrames = clampMaxFrames(options.maxFrames);
  const duration = probeDurationSeconds(resolved);
  const { start, end } = resolveViewWindow(
    duration,
    options.startSeconds,
    options.endSeconds,
  );
  const span = end - start;
  const { times: relative, thinned } = computeFrameTimestamps(
    span,
    fps,
    maxFrames,
  );
  const times = relative.map((t) => start + t);

  const outDir =
    options.outDir ??
    path.join(os.tmpdir(), `devicewright-frames-${Date.now()}`);
  const safeOut = assertSafeOutputPath(outDir);
  fs.mkdirSync(safeOut, { recursive: true });

  const frames: ExtractedFrame[] = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i]!;
    const seekT = clampSeekTime(t, duration);
    const framePath = path.join(
      safeOut,
      `frame_${String(i).padStart(4, "0")}_t${t.toFixed(3)}.jpg`,
    );
    extractOneFrame(resolved, seekT, framePath);
    frames.push({ path: framePath, t });
  }

  return {
    frames,
    duration,
    startSeconds: start,
    endSeconds: end,
    thinned,
    fps,
    maxFrames,
    outDir: safeOut,
  };
}

export function deleteFrameFiles(outDir: string): void {
  const resolved = assertSafePath(outDir, { mustExist: false });
  if (!fs.existsSync(resolved)) return;
  try {
    fs.rmSync(resolved, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}

export function ffmpegAvailable(): boolean {
  return runSync("ffmpeg", ["-version"]).status === 0;
}

export function ffprobeAvailable(): boolean {
  return runSync("ffprobe", ["-version"]).status === 0;
}
