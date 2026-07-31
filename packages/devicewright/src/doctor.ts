import process from "node:process";
import { adbAvailable, getAdbBin, listDevices } from "./android";
import { runSync } from "./exec";
import { idbAvailable } from "./ios/idb";
import { listSimulators } from "./ios/simctl";
import type { DoctorCheck } from "./types";

export type DoctorReport = {
  ok: boolean;
  checks: DoctorCheck[];
};

function checkXcode(): DoctorCheck {
  const xcode = runSync("xcodebuild", ["-version"]);
  return {
    name: "xcode",
    ok: xcode.status === 0,
    detail:
      xcode.status === 0
        ? xcode.stdout.trim().split("\n")[0] || "ok"
        : xcode.stderr || "xcodebuild not found (macOS only)",
  };
}

function checkSimctl(): DoctorCheck {
  const simctl = runSync("xcrun", ["simctl", "help"]);
  return {
    name: "simctl",
    ok: simctl.status === 0,
    detail: simctl.status === 0 ? "ok" : "xcrun simctl unavailable",
  };
}

function checkSimulators(): DoctorCheck {
  try {
    const sims = listSimulators();
    const booted = sims.filter((s) => s.state === "Booted");
    return {
      name: "simulators",
      ok: true,
      detail: `${sims.length} sims, ${booted.length} booted`,
    };
  } catch (e) {
    return { name: "simulators", ok: false, detail: String(e) };
  }
}

function checkIdb(idbPath?: string): DoctorCheck {
  const idbOk = idbAvailable(idbPath);
  const resolved =
    idbPath ||
    process.env.DEVICEWRIGHT_IDB_PATH ||
    process.env.IOS_SIMULATOR_MCP_IDB_PATH ||
    "idb";
  return {
    name: "idb",
    ok: idbOk,
    detail: idbOk
      ? `found (${resolved})`
      : "idb not found — set DEVICEWRIGHT_IDB_PATH or IOS_SIMULATOR_MCP_IDB_PATH",
  };
}

function checkAdb(
  adbPath: string | undefined,
  requireAndroid: boolean,
): DoctorCheck {
  const adbOk = adbAvailable(adbPath);
  let detail = adbOk ? `found (${getAdbBin(adbPath)})` : "adb not found";
  if (adbOk) {
    try {
      detail += `; ${listDevices(adbPath).length} device(s)`;
    } catch {
      // ignore
    }
  }
  return {
    name: "adb",
    ok: requireAndroid ? adbOk : true,
    detail,
  };
}

function checkFfmpeg(): DoctorCheck {
  const ffmpeg = runSync("ffmpeg", ["-version"]);
  const ffprobe = runSync("ffprobe", ["-version"]);
  const okTools = ffmpeg.status === 0 && ffprobe.status === 0;
  return {
    name: "ffmpeg",
    // Warn-only: missing ffmpeg does not fail doctor.ok (record/stop work without it).
    ok: true,
    detail: okTools
      ? "found (needed for ui_view_recording)"
      : "WARN missing — record/stop work; ui_view_recording needs ffmpeg+ffprobe",
  };
}

export function runDoctor(
  options: {
    idbPath?: string;
    adbPath?: string;
    requireAndroid?: boolean;
  } = {},
): DoctorReport {
  const checks: DoctorCheck[] = [
    checkXcode(),
    checkSimctl(),
    checkSimulators(),
    checkIdb(options.idbPath),
    checkAdb(options.adbPath, options.requireAndroid === true),
    checkFfmpeg(),
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

export function formatDoctor(report: DoctorReport): string {
  const lines = report.checks.map(
    (c) => `${c.ok ? "PASS" : "FAIL"}  ${c.name}: ${c.detail}`,
  );
  lines.push(report.ok ? "\nDoctor OK" : "\nDoctor FAILED");
  return lines.join("\n");
}
