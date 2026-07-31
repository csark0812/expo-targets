import path from 'node:path';
import type { ExpoConfig } from '@expo/config-types';

import * as Paths from '../utils/paths';
import { getTargetInfoPlistForType } from './buildInfoPlist';
import type {
  InfoPlistPlan,
  IOSTargetProps,
  ProjectPaths,
  TargetPlanInput,
} from './types';

/**
 * URL schemes the extension may need to open the host app.
 * The bundle identifier is included because Expo registers it as a scheme and
 * `openHostApp()` relies on it.
 */
function resolveMainAppSchemes(expoConfig: Partial<ExpoConfig>): string[] {
  const schemes: string[] = [];
  if (typeof expoConfig.scheme === 'string') {
    schemes.push(expoConfig.scheme);
  } else if (Array.isArray(expoConfig.scheme)) {
    schemes.push(...expoConfig.scheme);
  }

  if (expoConfig.ios?.bundleIdentifier) {
    schemes.push(expoConfig.ios.bundleIdentifier);
  }

  return schemes;
}

function buildInfoPlistContents({
  props,
  mainAppSchemes,
  targetsConfig,
}: {
  props: IOSTargetProps;
  mainAppSchemes: string[];
  targetsConfig: any[] | undefined;
}): string {
  const hasActivationRules =
    Array.isArray(props.activationRules) && props.activationRules.length > 0;
  const shareExtensionConfig =
    hasActivationRules || props.preprocessingFile
      ? {
          activationRules: props.activationRules,
          preprocessingFile: props.preprocessingFile,
        }
      : undefined;

  return getTargetInfoPlistForType(props.type, {
    displayName: props.displayName,
    customProperties: props.infoPlist,
    shareExtensionConfig,
    entry: props.entry,
    mainAppSchemes: mainAppSchemes.length > 0 ? mainAppSchemes : undefined,
    targetsConfig,
    targetIcon: props.targetIcon,
    intentsConfig: props.intents,
  });
}

/**
 * Plan the generated `Info.plist`: where it goes and what it contains.
 */
export function planInfoPlist({
  props,
  expoConfig,
  paths,
}: Pick<TargetPlanInput, 'props' | 'expoConfig'> & {
  paths: ProjectPaths;
}): InfoPlistPlan {
  const infoPlistPath = Paths.getTargetInfoPlistPath({
    projectRoot: paths.projectRoot,
    targetDirectory: props.directory,
    buildSubdirectory: props.buildSubdirectory,
  });
  const mainAppSchemes = resolveMainAppSchemes(expoConfig);
  const targetsConfig = expoConfig.extra?.targets as any[] | undefined;

  return {
    path: infoPlistPath,
    referencePath: path.relative(paths.platformProjectRoot, infoPlistPath),
    contents: buildInfoPlistContents({ props, mainAppSchemes, targetsConfig }),
    mainAppSchemes,
    embeddedTargetCount: targetsConfig?.length ?? 0,
  };
}
