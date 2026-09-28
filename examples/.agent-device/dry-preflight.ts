import fs from "node:fs";
import path from "node:path";
import {
  createAgentDeviceClient,
  type DoctorCommandResult,
} from "agent-device";
import { REQUIRED_V2 } from "./required";
import { exampleExists, repoRoot } from "./root";
import { blockingCapabilities } from "./capabilities";

export type DoctorCheck = { name: string; ok: boolean; detail: string };
export type DryPreflightReport = {
  ok: boolean;
  checks: DoctorCheck[];
  repoRoot: string;
  doctor: unknown;
};

function checkRequiredPaths(): DoctorCheck {
  const missing = REQUIRED_V2.filter((row) => !exampleExists(row.path)).map(
    (row) => row.path,
  );
  return {
    name: "REQUIRED_V2_paths",
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `${REQUIRED_V2.length} paths present`
        : `missing: ${missing.join(", ")}`,
  };
}

function checkReadmeReleaseRecipes(): DoctorCheck {
  const readmePath = path.join(import.meta.dir, "README.md");
  const text = fs.readFileSync(readmePath, "utf8");
  const needles = ["Release", "dry-preflight", "examples:agent-device", "matrix"];
  const missing = needles.filter((needle) => !text.includes(needle));
  return {
    name: "readme_release_recipes",
    ok: missing.length === 0,
    detail: missing.length ? `README missing: ${missing.join(", ")}` : "documented",
  };
}

const OPTIONAL_RELEASE_DOCTOR_CHECKS = new Set([
  "metro",
  "session",
  "web-agent-browser-processes",
]);

export function classifyDoctorResult(
  platform: "ios" | "android",
  result: DoctorCommandResult,
): DoctorCheck {
  const failed = result.checks.filter((check) => check.status === "fail");
  const blockers = failed.filter(
    (check) => !OPTIONAL_RELEASE_DOCTOR_CHECKS.has(check.id),
  );
  const optional = failed.filter((check) => OPTIONAL_RELEASE_DOCTOR_CHECKS.has(check.id));
  const unaccountedFailure = result.status === "fail" && failed.length === 0;
  return {
    name: "agent_device_doctor",
    ok: blockers.length === 0 && !unaccountedFailure,
    detail:
      blockers.length > 0
        ? `blocking checks failed: ${blockers.map((check) => check.id).join(", ")}`
        : unaccountedFailure
          ? `doctor returned fail without a structured failed check`
          : `${platform} Release prerequisites ready${optional.length ? `; optional checks unavailable: ${optional.map((check) => check.id).join(", ")}` : ""}`,
  };
}

export async function runDryPreflight(
  options: { allowNoSim?: boolean; requireAndroid?: boolean } = {},
): Promise<DryPreflightReport> {
  const root = repoRoot();
  const platform = options.requireAndroid ? "android" : "ios";
  const client = createAgentDeviceClient({
    session: `expo-targets-preflight-${process.pid}`,
    cwd: root,
    responseLevel: "full",
  });
  let doctor: unknown;
  let doctorCheck: DoctorCheck;
  let deviceCheck: DoctorCheck;
  try {
    const result = await client.command.doctor({ platform });
    doctor = result;
    doctorCheck = classifyDoctorResult(platform, result);
  } catch (error) {
    doctor = error;
    doctorCheck = { name: "agent_device_doctor", ok: false, detail: String(error) };
  }
  try {
    const available = await client.devices.list({ platform });
    const booted = available.filter((device) => device.booted);
    deviceCheck = {
      name: options.requireAndroid ? "booted_android" : "booted_sim",
      ok: booted.length > 0 || options.allowNoSim === true,
      detail: booted.length
        ? `${booted.length} booted (${booted.map((device) => device.name).join(", ")})`
        : options.allowNoSim
          ? "no booted device (allowed)"
          : "no booted device",
    };
  } catch (error) {
    deviceCheck = {
      name: options.requireAndroid ? "booted_android" : "booted_sim",
      ok: false,
      detail: String(error),
    };
  }

  const checks = [
    { name: "repo_root", ok: fs.existsSync(root), detail: root },
    checkRequiredPaths(),
    doctorCheck,
    deviceCheck,
    {
      name: "required_capabilities",
      ok: blockingCapabilities(undefined, platform).length === 0,
      detail:
        blockingCapabilities(undefined, platform).length === 0
          ? "all REQUIRED matrix capabilities mapped"
          : blockingCapabilities(undefined, platform)
              .map(
                (entry) =>
                  `${entry.primitive}: ${entry.affectedRows?.join(",") ?? "unknown"}`,
              )
              .join("; "),
    },
    checkReadmeReleaseRecipes(),
  ];
  return { ok: checks.every((check) => check.ok), checks, repoRoot: root, doctor };
}

export function formatDryPreflight(report: DryPreflightReport): string {
  return [
    ...report.checks.map(
      (check) => `${check.ok ? "PASS" : "FAIL"}  ${check.name}: ${check.detail}`,
    ),
    report.ok ? "\nDry-preflight OK" : "\nDry-preflight FAILED",
  ].join("\n");
}
