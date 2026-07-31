import fs from 'node:fs';
import path from 'node:path';

// @ts-expect-error - no types available for xcode package
import xcode from 'xcode';

import type { UitestEnvKey } from './constants';
import type { MatrixEntry } from './matrix';
import { exampleIosDir, findXcodeproj, fixturePath } from './paths';
import {
  findHostApplication,
  hostBundleId,
  knownTargetNames,
  type PbxProject,
} from './pbx';
import { ensureSmokeSourceFile } from './pbxSources';
import { ensureUiTestNativeTarget } from './pbxUiTest';
import { findHostSchemePath, updateHostScheme } from './scheme';

export type AttachResult = {
  exampleRel: string;
  xcodeprojPath: string;
  schemePath: string;
  uiTestCreated: boolean;
  testableAdded: boolean;
  removedStale: number;
};

function copyFixture(destDir: string, smokeFileName: string): void {
  const src = fixturePath(smokeFileName);
  if (!fs.existsSync(src)) {
    throw new Error(`missing fixture ${src}`);
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, smokeFileName));
}

function productReferenceName(
  project: PbxProject,
  targetUuid: string,
  targetName: string
): string {
  const target = project.pbxNativeTargetSection()[targetUuid];
  const productRef = target?.productReference;
  const fileRefs = project.hash.project.objects.PBXFileReference ?? {};
  const ref = fileRefs[productRef];
  const name = String(ref?.path ?? ref?.name ?? `${targetName}.xctest`);
  return name.replace(/^"/, '').replace(/"$/, '');
}

function openProject(pbxprojPath: string): PbxProject {
  const project = xcode.project(pbxprojPath) as PbxProject;
  project.parseSync();
  return project;
}

function wirePbx(opts: { project: PbxProject; entry: MatrixEntry }): {
  uuid: string;
  created: boolean;
  hostName: string;
} {
  const host = findHostApplication(opts.project);
  const bundleId = hostBundleId(opts.project, host);
  const uiTest = ensureUiTestNativeTarget({
    project: opts.project,
    targetName: opts.entry.uiTestTargetName,
    hostUuid: host.uuid,
    hostName: host.name,
    hostBundleId: bundleId,
  });
  ensureSmokeSourceFile({
    project: opts.project,
    targetUuid: uiTest.uuid,
    targetName: opts.entry.uiTestTargetName,
    smokeFileName: opts.entry.smokeFileName,
  });
  return { uuid: uiTest.uuid, created: uiTest.created, hostName: host.name };
}

function wireScheme(opts: {
  entry: MatrixEntry;
  project: PbxProject;
  xcodeprojPath: string;
  hostName: string;
  uiTestUuid: string;
}): ReturnType<typeof updateHostScheme> {
  const schemePath = findHostSchemePath({
    xcodeprojPath: opts.xcodeprojPath,
    hostName: opts.hostName,
  });
  return updateHostScheme({
    schemePath,
    projectFileName: path.basename(opts.xcodeprojPath),
    knownTargetNames: knownTargetNames(opts.project),
    uiTestTargetName: opts.entry.uiTestTargetName,
    uiTest: {
      blueprintId: opts.uiTestUuid,
      blueprintName: opts.entry.uiTestTargetName,
      buildableName: productReferenceName(
        opts.project,
        opts.uiTestUuid,
        opts.entry.uiTestTargetName
      ),
    },
    env: opts.entry.env as Partial<Record<UitestEnvKey, string>>,
  });
}

/** Idempotent post-prebuild attach for a matrix suite entry. */
export function attachExample(entry: MatrixEntry): AttachResult {
  const iosDir = exampleIosDir(entry.exampleRel);
  if (!fs.existsSync(iosDir)) {
    throw new Error(
      `missing ${iosDir} — run: cd ${entry.exampleRel} && npx expo prebuild --platform ios`
    );
  }
  copyFixture(path.join(iosDir, entry.uiTestTargetName), entry.smokeFileName);
  const xcodeprojPath = findXcodeproj(iosDir);
  const pbxprojPath = path.join(xcodeprojPath, 'project.pbxproj');
  const project = openProject(pbxprojPath);
  const wired = wirePbx({ project, entry });
  fs.writeFileSync(pbxprojPath, project.writeSync());
  const schemeUpdate = wireScheme({
    entry,
    project,
    xcodeprojPath,
    hostName: wired.hostName,
    uiTestUuid: wired.uuid,
  });
  return {
    exampleRel: entry.exampleRel,
    xcodeprojPath,
    schemePath: schemeUpdate.path,
    uiTestCreated: wired.created,
    testableAdded: schemeUpdate.addedTestable,
    removedStale: schemeUpdate.removedStale,
  };
}
