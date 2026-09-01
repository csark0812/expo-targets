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
import * as Paths from '../utils/paths';

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
    const projectName =
      config.modRequest.projectName || getProjectName(platformProjectRoot);
    const productName = Paths.sanitizeTargetName(props.name);

    props.logger.log(
      `Adding Xcode target: ${productName} (${props.type}${
        props.displayName ? `, display ${props.displayName}` : ''
      })`
    );

    const workspace = buildTargetWorkspace({
      projectRoot,
      platformProjectRoot,
      projectName,
      productName,
      directory: props.directory,
      type: props.type,
    });

    const mainTarget = getApplicationNativeTarget({
      project,
      projectName,
    });

    const plan = composeXcodeTargetPlan({
      props,
      expoConfig: config,
      workspace,
      paths: { projectRoot, platformProjectRoot, projectName },
      mainBuildSettings: getMainAppBuildSettings({ project, mainTarget }),
    });

    applyFsTargetPlan(plan, { logger: props.logger });
    applyXcodeTargetPlan(project, plan, { mainTarget, logger: props.logger });

    props.logger.logSparse(true, 'Configured target', plan.identity.targetName);

    return config;
  });
