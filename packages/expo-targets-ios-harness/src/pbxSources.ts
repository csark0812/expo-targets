import type { PbxProject } from './pbx';
import { unquote } from './pbx';

function ensureUiTestGroup(project: PbxProject, targetName: string): string {
  const existing =
    project.findPBXGroupKey({
      name: targetName,
      path: targetName,
    }) ?? project.findPBXGroupKey({ name: targetName });
  if (existing) {
    return existing;
  }
  const created = project.addPbxGroup([], targetName, targetName, '"<group>"');
  const main = project.getFirstProject().firstProject.mainGroup;
  project.addToPbxGroup(created.uuid, main);
  return created.uuid;
}

function refPath(ref: any): string {
  return unquote(ref?.path ?? ref?.name ?? '');
}

function smokeChildren(
  project: PbxProject,
  groupKey: string,
  smokeFileName: string
): Array<{ value: string; path: string }> {
  const group = project.hash.project.objects.PBXGroup?.[groupKey];
  const fileRefs = project.hash.project.objects.PBXFileReference ?? {};
  const out: Array<{ value: string; path: string }> = [];
  for (const child of group?.children ?? []) {
    const ref = fileRefs[child.value];
    if (!ref) {
      continue;
    }
    const p = refPath(ref);
    if (p === smokeFileName || p.endsWith(`/${smokeFileName}`)) {
      out.push({ value: child.value, path: p });
    }
  }
  return out;
}

function dropBadSmokeRefs(opts: {
  project: PbxProject;
  groupKey: string;
  targetUuid: string;
  smokeFileName: string;
}): void {
  for (const child of smokeChildren(
    opts.project,
    opts.groupKey,
    opts.smokeFileName
  )) {
    if (child.path === opts.smokeFileName) {
      continue;
    }
    opts.project.removeSourceFile(
      child.path,
      { target: opts.targetUuid },
      opts.groupKey
    );
  }
}

/** Ensure smoke Swift file is in the UITest group Sources (basename path). */
export function ensureSmokeSourceFile(opts: {
  project: PbxProject;
  targetUuid: string;
  targetName: string;
  smokeFileName: string;
}): void {
  const groupKey = ensureUiTestGroup(opts.project, opts.targetName);
  dropBadSmokeRefs({ ...opts, groupKey });
  const ok = smokeChildren(opts.project, groupKey, opts.smokeFileName).some(
    (c) => c.path === opts.smokeFileName
  );
  if (ok) {
    return;
  }
  opts.project.addSourceFile(
    opts.smokeFileName,
    { target: opts.targetUuid },
    groupKey
  );
}
