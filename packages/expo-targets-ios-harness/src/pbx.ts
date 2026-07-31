import { APPLICATION_PRODUCT_TYPE, UITEST_TARGET_NAME } from './constants';

export type PbxProject = {
  parseSync: () => void;
  writeSync: () => string;
  generateUuid: () => string;
  addTarget: (
    name: string,
    type: string,
    subfolder?: string,
    bundleId?: string
  ) => { uuid: string; pbxNativeTarget: any };
  addTargetDependency: (target: string, deps: string[]) => unknown;
  addBuildPhase: (
    files: string[],
    type: string,
    comment: string,
    target: string
  ) => unknown;
  addSourceFile: (filePath: string, opt: any, group?: string) => unknown;
  removeSourceFile: (filePath: string, opt: any, group?: string) => unknown;
  addPbxGroup: (
    files: string[],
    name: string,
    groupPath?: string,
    sourceTree?: string
  ) => { uuid: string; pbxGroup: any };
  addToPbxGroup: (file: any, groupKey: string) => void;
  findPBXGroupKey: (criteria: {
    name?: string;
    path?: string;
  }) => string | null;
  findTargetKey: (name: string) => string | null;
  pbxTargetByName: (name: string) => any;
  updateBuildProperty: (
    prop: string,
    value: string,
    build?: string,
    targetName?: string
  ) => void;
  getFirstProject: () => { uuid: string; firstProject: any };
  pbxNativeTargetSection: () => Record<string, any>;
  pbxXCBuildConfigurationSection: () => Record<string, any>;
  pbxXCConfigurationList: () => Record<string, any>;
  hash: {
    project: {
      rootObject: string;
      objects: Record<string, Record<string, any>>;
    };
  };
};

export function unquote(value: unknown): string {
  const raw = String(value ?? '');
  return raw.replace(/^"/, '').replace(/"$/, '');
}

function isCommentKey(key: string): boolean {
  return key.endsWith('_comment');
}

function bundleIdForTarget(project: PbxProject, target: any): string {
  const listUuid = target.buildConfigurationList;
  const list = project.pbxXCConfigurationList()[listUuid];
  if (!list?.buildConfigurations) {
    return '';
  }
  const configs = project.pbxXCBuildConfigurationSection();
  for (const entry of list.buildConfigurations) {
    const settings = configs[entry.value]?.buildSettings;
    const id = unquote(settings?.PRODUCT_BUNDLE_IDENTIFIER);
    if (id) {
      return id;
    }
  }
  return '';
}

export function listNativeTargets(
  project: PbxProject
): Array<{ uuid: string; name: string; target: any }> {
  const section = project.pbxNativeTargetSection();
  const out: Array<{ uuid: string; name: string; target: any }> = [];
  for (const key of Object.keys(section)) {
    if (isCommentKey(key)) {
      continue;
    }
    const target = section[key];
    out.push({ uuid: key, name: unquote(target.name), target });
  }
  return out;
}

export function hostBundleId(
  project: PbxProject,
  target: { target: any }
): string {
  return (
    bundleIdForTarget(project, target.target) ||
    'com.expotargets.example.uitests'
  );
}

export function findHostApplication(project: PbxProject): {
  uuid: string;
  name: string;
  target: any;
} {
  const apps = listNativeTargets(project).filter(
    (t) => unquote(t.target.productType) === APPLICATION_PRODUCT_TYPE
  );
  const preferred = apps.find((t) => {
    const bundleId = bundleIdForTarget(project, t.target);
    return !/\.clip$/i.test(bundleId);
  });
  const host = preferred ?? apps[0];
  if (!host) {
    throw new Error('no application target');
  }
  return host;
}

export function findUiTestTarget(
  project: PbxProject
): { uuid: string; name: string; target: any } | null {
  return (
    listNativeTargets(project).find((t) => t.name === UITEST_TARGET_NAME) ??
    null
  );
}

export function knownTargetNames(project: PbxProject): Set<string> {
  return new Set(listNativeTargets(project).map((t) => t.name));
}
