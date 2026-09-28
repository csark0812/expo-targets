import { describe, expect, test } from "bun:test";
import { AppError } from "agent-device";
import {
  AgentDeviceOperatorError,
  classifyAgentDeviceFailure,
} from "./driver";
import { journeyFailure } from "./journeys/helpers";

describe("agent-device failure classification", () => {
  test("classifies a structured missing-app failure as operator setup", () => {
    expect(
      classifyAgentDeviceFailure(
        new AppError("APP_NOT_INSTALLED", "missing", {
          package: "com.expotargets.missing",
        }),
      ),
    ).toBe("operator");
  });

  test("keeps transport failures separate from product assertions", () => {
    expect(
      classifyAgentDeviceFailure(
        new AppError("DEVICE_NOT_FOUND", "missing emulator"),
      ),
    ).toBe("infra");
    expect(classifyAgentDeviceFailure(new Error("oracle mismatch"))).toBe(
      "product",
    );
  });

  test("does not classify invalid arguments or free-form messages as operator setup", () => {
    expect(
      classifyAgentDeviceFailure(
        new AppError("INVALID_ARGS", "bad request", {
          reason: "missing credential text must not drive classification",
        }),
      ),
    ).toBe("product");
  });

  test("keeps a typed operator failure classified after a journey boundary", () => {
    const error = new AgentDeviceOperatorError(
      "APP_NOT_INSTALLED",
      "No package found matching the host",
    );
    expect(classifyAgentDeviceFailure(error)).toBe("operator");
    expect(String(error)).toContain("app not installed");
  });

  test("maps structured failure kinds to terminal journey statuses", () => {
    const result = (error: unknown) =>
      journeyFailure({
        id: "share",
        path: "examples/share",
        phase: 1,
        steps: ["launch-host"],
        error,
      });

    expect(result(new AppError("DEVICE_NOT_FOUND", "missing")).status).toBe(
      "infra",
    );
    expect(result(new AppError("APP_NOT_INSTALLED", "missing")).status).toBe(
      "operator",
    );
    expect(result(new AppError("INVALID_ARGS", "bad selector")).status).toBe(
      "red",
    );
  });
});
