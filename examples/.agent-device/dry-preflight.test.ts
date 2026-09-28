import { describe, expect, test } from "bun:test";
import type { DoctorCommandResult } from "agent-device";
import { classifyDoctorResult } from "./dry-preflight";

function doctor(
  status: DoctorCommandResult["status"],
  checks: DoctorCommandResult["checks"],
): DoctorCommandResult {
  return {
    status,
    summary: "fixture",
    kind: "expo",
    platform: "ios",
    checks,
  };
}

describe("agent-device dry preflight doctor policy", () => {
  test("allows absent Metro for Release journeys", () => {
    expect(
      classifyDoctorResult(
        "ios",
        doctor("fail", [
          { id: "metro", status: "fail", summary: "not running" },
          { id: "agent-device", status: "pass", summary: "ready" },
          { id: "device", status: "pass", summary: "ready" },
        ]),
      ),
    ).toEqual({
      name: "agent_device_doctor",
      ok: true,
      detail: "ios Release prerequisites ready; optional checks unavailable: metro",
    });
  });

  test("fails a structured toolchain or runner blocker", () => {
    const result = classifyDoctorResult(
      "ios",
      doctor("fail", [
        { id: "toolchain", status: "fail", summary: "Xcode unavailable" },
      ]),
    );
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("toolchain");
  });

  test("fails closed when doctor reports an unexplained failure", () => {
    expect(classifyDoctorResult("android", doctor("fail", [])).ok).toBe(false);
  });
});
