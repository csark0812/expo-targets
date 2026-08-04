import path from 'node:path';

import type { TargetWorkspace } from '../observe/workspace';
import type {
  IOSTargetProps,
  SwiftFilePlan,
  SwiftTemplatePlan,
  TargetIdentity,
} from './types';

/** A file plan before its project-relative reference path is resolved. */
type UnresolvedSwiftFilePlan = Omit<SwiftFilePlan, 'referencePath'>;

const REACT_NATIVE_VIEW_CONTROLLER = 'ReactNativeViewController.swift';
const REACT_NATIVE_CLIP_APP = 'ReactNativeClipApp.swift';
const MESSAGES_VIEW_CONTROLLER = 'MessagesViewController.swift';
const SAFARI_HANDLER = 'SafariWebExtensionHandler.swift';

/** Match a well-known file name at the root or nested in a subdirectory. */
function isNamed(file: string, fileName: string): boolean {
  return (
    file === fileName ||
    file.endsWith(`/${fileName}`) ||
    file.endsWith(`\\${fileName}`)
  );
}

function isTestFile(file: string): boolean {
  return (
    file.includes('Tests/') ||
    file.includes('/Tests') ||
    file.endsWith('.test.swift') ||
    file.endsWith('Tests.swift')
  );
}

/**
 * Decide which Swift file names the target should compile.
 *
 * Safari extensions render through a web view, so they only need the handler,
 * never the React Native view controller. Native React Native extensions get
 * generated view controllers when the user provided no Swift of their own.
 */
function ensureNamed(files: string[], name: string): void {
  if (!files.some((file) => isNamed(file, name))) {
    files.push(name);
  }
}

function resolveEntryOnlySwiftFiles(props: IOSTargetProps): string[] {
  if (props.type === 'messages') {
    return [MESSAGES_VIEW_CONTROLLER, REACT_NATIVE_VIEW_CONTROLLER];
  }
  if (props.type === 'clip') {
    return [REACT_NATIVE_CLIP_APP, REACT_NATIVE_VIEW_CONTROLLER];
  }
  return [REACT_NATIVE_VIEW_CONTROLLER];
}

function resolveSwiftFileNames(
  workspace: TargetWorkspace,
  props: IOSTargetProps
): string[] {
  const files = [...workspace.swiftFiles];

  if (props.type === 'safari') {
    ensureNamed(files, SAFARI_HANDLER);
    return files;
  }

  if (props.entry && files.length === 0) {
    return resolveEntryOnlySwiftFiles(props);
  }

  // Notification content: user principal hosts RN child when entry is set.
  if (props.entry && props.type === 'notification-content') {
    ensureNamed(files, REACT_NATIVE_VIEW_CONTROLLER);
  }

  return files;
}

function reactNativeTemplate(
  props: IOSTargetProps,
  identity: TargetIdentity
): SwiftTemplatePlan {
  return {
    template: 'reactNativeViewController',
    options: {
      type: props.type,
      // AppRegistry / createTarget(name) — must NOT use displayName product
      // (Example Action → ExampleActionTarget). Mismatch aborts the extension.
      moduleName: identity.name,
      targetName: props.name,
      preprocessingFile: props.preprocessingFile,
      entry: props.entry,
    },
  };
}

/**
 * A generated file lives in the build directory unless the user shadowed it
 * with their own copy in `<target>/ios/`.
 */
function planGeneratedFile({
  file,
  fileName,
  hasUserFile,
  workspace,
  template,
}: {
  file: string;
  fileName: string;
  hasUserFile: boolean;
  workspace: TargetWorkspace;
  template: SwiftTemplatePlan;
}): UnresolvedSwiftFilePlan {
  if (hasUserFile) {
    return {
      file,
      sourcePath: path.join(workspace.targetDirectory, fileName),
    };
  }

  return {
    file,
    sourcePath: path.join(workspace.targetBuildPath, fileName),
    generate: template,
  };
}

function planUserFile({
  file,
  workspace,
}: {
  file: string;
  workspace: TargetWorkspace;
}): UnresolvedSwiftFilePlan | undefined {
  const sourcePath = path.join(workspace.targetDirectory, file);

  // Validate that file is within the target directory (security check)
  if (
    !path
      .normalize(sourcePath)
      .startsWith(path.normalize(workspace.targetDirectory))
  ) {
    throw new Error(
      `Swift file is outside target directory: ${file}\n` +
        `Expected in: ${path.relative(workspace.projectRoot, workspace.targetDirectory)}`
    );
  }

  if (isTestFile(file)) {
    return;
  }

  return { file, sourcePath };
}

function planSwiftFile({
  file,
  workspace,
  props,
  identity,
}: {
  file: string;
  workspace: TargetWorkspace;
  props: IOSTargetProps;
  identity: TargetIdentity;
}): UnresolvedSwiftFilePlan | undefined {
  if (
    props.entry &&
    props.type === 'messages' &&
    isNamed(file, MESSAGES_VIEW_CONTROLLER)
  ) {
    return planGeneratedFile({
      file,
      fileName: MESSAGES_VIEW_CONTROLLER,
      hasUserFile: workspace.hasUserMessagesViewController,
      workspace,
      template: { template: 'messagesViewController' },
    });
  }

  if (props.entry && isNamed(file, REACT_NATIVE_CLIP_APP)) {
    return planGeneratedFile({
      file,
      fileName: REACT_NATIVE_CLIP_APP,
      hasUserFile: workspace.swiftFiles.some((f) =>
        isNamed(f, REACT_NATIVE_CLIP_APP)
      ),
      workspace,
      template: { template: 'reactNativeClipApp' },
    });
  }

  if (props.entry && isNamed(file, REACT_NATIVE_VIEW_CONTROLLER)) {
    return planGeneratedFile({
      file,
      fileName: REACT_NATIVE_VIEW_CONTROLLER,
      hasUserFile: workspace.hasUserReactNativeViewController,
      workspace,
      template: reactNativeTemplate(props, identity),
    });
  }

  if (props.type === 'safari' && isNamed(file, SAFARI_HANDLER)) {
    return planGeneratedFile({
      file,
      fileName: SAFARI_HANDLER,
      hasUserFile: workspace.hasUserSafariSwiftHandler,
      workspace,
      template: {
        template: 'safariWebExtensionHandler',
        options: { targetName: identity.targetName },
      },
    });
  }

  return planUserFile({ file, workspace });
}

/**
 * Plan the Swift sources for a target. Pure: reads only the observed workspace,
 * never the file system.
 */
export function planSwiftSources({
  workspace,
  props,
  identity,
  platformProjectRoot,
}: {
  workspace: TargetWorkspace;
  props: IOSTargetProps;
  identity: TargetIdentity;
  platformProjectRoot: string;
}): SwiftFilePlan[] {
  const plans: SwiftFilePlan[] = [];

  for (const file of resolveSwiftFileNames(workspace, props)) {
    const plan = planSwiftFile({ file, workspace, props, identity });
    if (plan) {
      plans.push({
        ...plan,
        referencePath: path.relative(platformProjectRoot, plan.sourcePath),
      });
    }
  }

  return plans;
}
