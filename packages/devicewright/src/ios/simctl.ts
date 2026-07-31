import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import {
  assertSafeDeviceId,
  assertSafeOutputPath,
  assertSafePath,
} from "../allowlist";
import { runSync, runSyncOrThrow } from "../exec";
import { notifyDeviceChild } from "./idb";

export type SimDevice = {
  udid: string;
  name: string;
  state: string;
  runtime: string;
  isAvailable: boolean;
};

function simctl(args: string[]): string {
  return runSyncOrThrow("xcrun", ["simctl", ...args]);
}

export function listSimulators(): SimDevice[] {
  const raw = simctl(["list", "devices", "-j"]);
  const json = JSON.parse(raw) as {
    devices?: Record<
      string,
      Array<{
        udid: string;
        name: string;
        state: string;
        isAvailable?: boolean;
      }>
    >;
  };
  const out: SimDevice[] = [];
  for (const [runtime, devices] of Object.entries(json.devices ?? {})) {
    for (const d of devices) {
      out.push({
        udid: d.udid,
        name: d.name,
        state: d.state,
        runtime,
        isAvailable: d.isAvailable !== false,
      });
    }
  }
  return out;
}

export function resolveSimulatorId(device?: string, deviceId?: string): string {
  if (deviceId) {
    return assertSafeDeviceId(deviceId);
  }
  if (!device) {
    const booted = listSimulators().find((d) => d.state === "Booted");
    if (booted) return booted.udid;
    throw new Error("no device specified and no booted simulator");
  }
  const safe = device.trim();
  const all = listSimulators();
  const byUdid = all.find((d) => d.udid === safe);
  if (byUdid) return byUdid.udid;
  const byName = all.filter((d) => d.name === safe || d.name.includes(safe));
  const booted = byName.find((d) => d.state === "Booted");
  if (booted) return booted.udid;
  if (byName[0]) return byName[0].udid;
  throw new Error(`simulator not found: ${device}`);
}

export function assertSimulatorExists(udid: string): void {
  const id = assertSafeDeviceId(udid);
  const found = listSimulators().some((d) => d.udid === id);
  if (!found) {
    throw new Error(
      `simulator UDID ${id} not found. Boot/create it or pass a valid deviceId.`,
    );
  }
}

export function bootSimulator(udid: string): void {
  const id = assertSafeDeviceId(udid);
  runSync("xcrun", ["simctl", "boot", id]);
  const status = runSync("xcrun", ["simctl", "bootstatus", id, "-b"], {
    timeout: 120_000,
  });
  if (status.status !== 0) {
    throw new Error(
      `simulator ${id} failed to become ready: ${status.stderr || status.stdout}`,
    );
  }
}

export function openSimulatorApp(): void {
  runSync("open", ["-a", "Simulator"]);
}

export function screenshotSim(udid: string, outputPath: string): string {
  const id = assertSafeDeviceId(udid);
  const out = assertSafeOutputPath(outputPath);
  simctl(["io", id, "screenshot", out]);
  return out;
}

export function installApp(udid: string, appPath: string): void {
  const id = assertSafeDeviceId(udid);
  const app = assertSafePath(appPath, { mustExist: true });
  simctl(["install", id, app]);
}

export function launchApp(
  udid: string,
  bundleId: string,
  options: { terminateRunning?: boolean; env?: Record<string, string> } = {},
): void {
  const id = assertSafeDeviceId(udid);
  if (options.terminateRunning) {
    runSync("xcrun", ["simctl", "terminate", id, bundleId]);
  }
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const [k, v] of Object.entries(options.env ?? {})) {
    env[`SIMCTL_CHILD_${k}`] = v;
  }
  runSyncOrThrow("xcrun", ["simctl", "launch", id, bundleId], { env });
}

export function terminateApp(udid: string, bundleId: string): void {
  runSync("xcrun", ["simctl", "terminate", assertSafeDeviceId(udid), bundleId]);
}

export type RecordVideoStartOptions = {
  codec?: "h264" | "hevc";
  force?: boolean;
  onSpawn?: (child: ChildProcess) => void;
};

export type RecordVideoProcess = {
  child: ChildProcess;
  path: string;
};

/**
 * Start simulator screen recording (long-lived child). Does not await exit.
 * Stop with stopRecording(child).
 */
export function recordVideoStart(
  udid: string,
  outputPath: string,
  options: RecordVideoStartOptions = {},
): RecordVideoProcess {
  const id = assertSafeDeviceId(udid);
  const out = assertSafeOutputPath(outputPath);
  const args = ["simctl", "io", id, "recordVideo"];
  if (options.codec) args.push(`--codec=${options.codec}`);
  if (options.force !== false) args.push("--force");
  args.push(out);

  const child = spawn("xcrun", args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  notifyDeviceChild(id, child);
  options.onSpawn?.(child);
  return { child, path: out };
}

const DEFAULT_STOP_TIMEOUT_MS = 5_000;

function waitForClose(
  child: ChildProcess,
  timeoutMs: number,
): Promise<"closed" | "timeout"> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve("closed");
      return;
    }
    let settled = false;
    const done = (result: "closed" | "timeout") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.removeListener("close", onClose);
      resolve(result);
    };
    const onClose = () => done("closed");
    const timer = setTimeout(() => done("timeout"), timeoutMs);
    child.once("close", onClose);
  });
}

/**
 * Graceful stop: SIGINT, await close; escalate to SIGKILL after timeoutMs.
 */
export async function stopRecording(
  child: ChildProcess,
  options: { timeoutMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_STOP_TIMEOUT_MS;
  if (child.exitCode === null && child.signalCode === null) {
    try {
      child.kill("SIGINT");
    } catch {
      // ignore
    }
  }
  const first = await waitForClose(child, timeoutMs);
  if (first === "timeout") {
    try {
      child.kill("SIGKILL");
    } catch {
      // ignore
    }
    await waitForClose(child, timeoutMs);
  }
}

export function assertRecordingFile(outputPath: string): string {
  const out = assertSafeOutputPath(outputPath);
  if (!fs.existsSync(out)) {
    throw new Error(`recording file missing after stop: ${out}`);
  }
  return out;
}

/**
 * idb has no shake command — drive Simulator.app Device → Shake via AppleScript.
 * Fails loud if Simulator is missing or Accessibility permissions block System Events.
 */
export function shakeSimulator(): void {
  const script = [
    'tell application "Simulator" to activate',
    "delay 0.2",
    'tell application "System Events"',
    '  tell process "Simulator"',
    '    click menu item "Shake" of menu "Device" of menu bar 1',
    "  end tell",
    "end tell",
  ].join("\n");
  const result = runSync("osascript", ["-e", script]);
  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout]
      .filter(Boolean)
      .join("\n")
      .trim();
    throw new Error(
      `shake failed (Simulator Device → Shake via AppleScript)${detail ? `: ${detail}` : ""}`,
    );
  }
}
