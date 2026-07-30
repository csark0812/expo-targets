import { describe, expect, test } from "bun:test";
import * as path from "node:path";

import { loadPbx } from "../../../../test-utils/loadPbx";
import {
  buildExtensionBundleShellScript,
  ensureBundleReactNativePhase,
} from "./bundleReactNative";
import { findTargetByProductName } from "./targetLifecycle";

const fixturePath = path.join(
  __dirname,
  "../../../../__fixtures__/pbx/minimal-app/project.pbxproj",
);

describe("buildExtensionBundleShellScript", () => {
  test("pins ENTRY_FILE to the target entry under PROJECT_ROOT", () => {
    const script = buildExtensionBundleShellScript("targets/share/index.tsx");
    expect(script).toContain(
      'export ENTRY_FILE="$PROJECT_ROOT/targets/share/index.tsx"',
    );
    expect(script).toContain("export:embed");
    expect(script).toContain("react-native-xcode.sh");
    expect(script).not.toContain("require('expo/scripts/resolveAppEntry')");
  });
});

describe("ensureBundleReactNativePhase", () => {
  test("adds an idempotent Bundle React Native shell phase", () => {
    const project = loadPbx(fixturePath);
    const targetUuid = findTargetByProductName({
      project,
      productName: "App",
    })!;

    ensureBundleReactNativePhase({
      project,
      targetUuid,
      plan: { entryFile: "targets/share/index.tsx" },
    });
    ensureBundleReactNativePhase({
      project,
      targetUuid,
      plan: { entryFile: "targets/share/index.tsx" },
    });

    const target = (project as any).hash.project.objects.PBXNativeTarget[
      targetUuid
    ];
    const section = (project as any).hash.project.objects
      .PBXShellScriptBuildPhase;
    const phases = target.buildPhases
      .map((ref: { value: string }) => section[ref.value])
      .filter(Boolean)
      .filter(
        (phase: { name?: string }) =>
          phase.name === "Bundle React Native code and images" ||
          phase.name === '"Bundle React Native code and images"',
      );

    expect(phases).toHaveLength(1);
    expect(phases[0].alwaysOutOfDate).toBe(1);
    expect(phases[0].shellScript).toContain("targets/share/index.tsx");
  });
});
