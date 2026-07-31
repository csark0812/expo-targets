import { SMOKE_FILE_NAME, UITEST_TARGET_NAME } from './constants';
import type { PbxProject } from './pbx';
import { unquote } from './pbx';

function ensureUiTestGroup(project: PbxProject): string {
  const existing =
    project.findPBXGroupKey({
      name: UITEST_TARGET_NAME,
      path: UITEST_TARGET_NAME,
    }) ?? project.findPBXGroupKey({ name: UITEST_TARGET_NAME });
  if (existing) {
    return existing;
  }
  const created = project.addPbxGroup(
    [],
    UITEST_TARGET_NAME,
    UITEST_TARGET_NAME,
    '"<group>"'
  );
  const main = project.getFirstProject().firstProject.mainGroup;
  project.addToPbxGroup(created.uuid, main);
  return created.uuid;
}

function refPath(ref: any): string {
  return unquote(ref?.path ?? ref?.name ?? '');
}

function smokeChildren(
  project: PbxProject,
  groupKey: string
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
    if (p === SMOKE_FILE_NAME || p.endsWith(`/${SMOKE_FILE_NAME}`)) {
      out.push({ value: child.value, path: p });
    }
  }
  return out;
}

function dropBadSmokeRefs(opts: {
  project: PbxProject;
  groupKey: string;
  targetUuid: string;
}): void {
  for (const child of smokeChildren(opts.project, opts.groupKey)) {
    if (child.path === SMOKE_FILE_NAME) {
      continue;
    }
    opts.project.removeSourceFile(
      child.path,
      { target: opts.targetUuid },
      opts.groupKey
    );
  }
}

/** Ensure ShareSheetSmoke.swift is in the UITest group Sources (basename path). */
export function ensureSmokeSourceFile(opts: {
  project: PbxProject;
  targetUuid: string;
}): void {
  const groupKey = ensureUiTestGroup(opts.project);
  dropBadSmokeRefs({ ...opts, groupKey });
  const ok = smokeChildren(opts.project, groupKey).some(
    (c) => c.path === SMOKE_FILE_NAME
  );
  if (ok) {
    return;
  }
  opts.project.addSourceFile(
    SMOKE_FILE_NAME,
    { target: opts.targetUuid },
    groupKey
  );
}
