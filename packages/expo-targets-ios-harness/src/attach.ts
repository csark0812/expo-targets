import fs from "node:fs";
import path from "node:path";

// @ts-expect-error - no types available for xcode package
import xcode from "xcode";

import {
  SMOKE_FILE_NAME,
  UITEST_TARGET_NAME,
  type UitestEnvKey,
} from "./constants";
import type { MatrixEntry } from "./matrix";
import { exampleIosDir, findXcodeproj, fixtureSmokePath } from "./paths";
import {
  findHostApplication,
  hostBundleId,
  knownTargetNames,
  type PbxProject,
} from "./pbx";
import { ensureSmokeSourceFile } from "./pbxSources";
import { ensureUiTestNativeTarget } from "./pbxUiTest";
import { findHostSchemePath, updateHostScheme } from "./scheme";

export type AttachResult = {
  exampleRel: string;
  xcodeprojPath: string;
  schemePath: string;
  uiTestCreated: boolean;
  testableAdded: boolean;
  removedStale: number;
};

function copyFixture(destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(fixtureSmokePath(), path.join(destDir, SMOKE_FILE_NAME));
}

function productReferenceName(project: PbxProject, targetUuid: string): string {
  const target = project.pbxNativeTargetSection()[targetUuid];
  const productRef = target?.productReference;
  const fileRefs = project.hash.project.objects.PBXFileReference ?? {};
  const ref = fileRefs[productRef];
  const name = String(ref?.path ?? ref?.name ?? `${UITEST_TARGET_NAME}.xctest`);
  return name.replace(/^"/, "").replace(/"$/, "");
}

/**
 * Idempotent post-prebuild attach (parity with former bash/ruby script).
 */
export function attachExample(entry: MatrixEntry): AttachResult {
  const iosDir = exampleIosDir(entry.exampleRel);
  if (!fs.existsSync(iosDir)) {
    throw new Error(
      `missing ${iosDir} — run: cd ${entry.exampleRel} && npx expo prebuild --platform ios`,
    );
  }

  const destDir = path.join(iosDir, UITEST_TARGET_NAME);
  copyFixture(destDir);

  const xcodeprojPath = findXcodeproj(iosDir);
  const pbxprojPath = path.join(xcodeprojPath, "project.pbxproj");
  const project = xcode.project(pbxprojPath) as PbxProject;
  project.parseSync();

  const host = findHostApplication(project);
  const bundleId = hostBundleId(project, host);
  const uiTest = ensureUiTestNativeTarget({
    project,
    hostUuid: host.uuid,
    hostName: host.name,
    hostBundleId: bundleId,
  });
  ensureSmokeSourceFile({ project, targetUuid: uiTest.uuid });
  fs.writeFileSync(pbxprojPath, project.writeSync());

  const schemePath = findHostSchemePath({
    xcodeprojPath,
    hostName: host.name,
  });
  const schemeUpdate = updateHostScheme({
    schemePath,
    projectFileName: path.basename(xcodeprojPath),
    knownTargetNames: knownTargetNames(project),
    uiTest: {
      blueprintId: uiTest.uuid,
      blueprintName: UITEST_TARGET_NAME,
      buildableName: productReferenceName(project, uiTest.uuid),
    },
    env: entry.env as Record<UitestEnvKey, string>,
  });

  return {
    exampleRel: entry.exampleRel,
    xcodeprojPath,
    schemePath: schemeUpdate.path,
    uiTestCreated: uiTest.created,
    testableAdded: schemeUpdate.addedTestable,
    removedStale: schemeUpdate.removedStale,
  };
}
