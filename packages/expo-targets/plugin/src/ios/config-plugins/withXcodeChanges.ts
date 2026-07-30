import { type ConfigPlugin, withXcodeProject } from '@expo/config-plugins';

import { applyFsTargetPlan } from '../apply/fs';
import {
  applyXcodeTargetPlan,
  getApplicationNativeTarget,
  getMainAppBuildSettings,
  getProjectName,
} from '../apply/pbx';
import { buildTargetWorkspace } from '../observe';
import { composeXcodeTargetPlan } from '../plan';
import type { IOSTargetProps } from '../plan/types';

export type { IOSTargetProps };

/**
 * Add one iOS target to the Xcode project.
 *
 * Orchestration only: observe the target directory, plan every decision, then
 * apply the plan to disk and to the PBX project.
 */
export const withXcodeChanges: ConfigPlugin<IOSTargetProps> = (config, props) =>
  withXcodeProject(config, async (config) => {
    const { projectRoot, platformProjectRoot } = config.modRequest;
    const project = config.modResults;

    props.logger.log(
      `Adding Xcode target: ${props.displayName || props.name} (${props.type})`
    );

    const workspace = buildTargetWorkspace({
      projectRoot,
      directory: props.directory,
      type: props.type,
      buildSubdirectory: props.buildSubdirectory,
    });

    const mainTarget = getApplicationNativeTarget({
      project,
      projectName: getProjectName(projectRoot),
    });

    const plan = composeXcodeTargetPlan({
      props,
      expoConfig: config,
      workspace,
      paths: { projectRoot, platformProjectRoot },
      mainBuildSettings: getMainAppBuildSettings({ project, mainTarget }),
    });

    applyFsTargetPlan(plan, { logger: props.logger });
    applyXcodeTargetPlan(project, plan, { mainTarget, logger: props.logger });

    props.logger.logSparse(true, 'Configured target', plan.identity.targetName);

    return config;
  });
