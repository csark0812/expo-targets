import path from 'node:path';

import { warnIfSealedHandEdited } from '../../../codegen/warnIfSealedHandEdited';
import type { Logger } from '../../../logger';
import type { SwiftFilePlan, SwiftTemplatePlan } from '../../plan/types';
import * as File from '../../utils/file';
import * as ReactNativeSwift from '../../utils/reactNativeSwift';
import * as Safari from '../../utils/safari';

function renderSwiftTemplate(plan: SwiftTemplatePlan): string {
  switch (plan.template) {
    case 'messagesViewController':
      return ReactNativeSwift.generateMessagesViewController();
    case 'reactNativeClipApp':
      return ReactNativeSwift.generateReactNativeClipApp();
    case 'safariWebExtensionHandler':
      return Safari.generateSafariSwiftHandler(plan.options.targetName);
    default:
      return ReactNativeSwift.generateReactNativeViewController(plan.options);
  }
}

/**
 * Write the Swift files the plugin owns. Generated files are always rewritten
 * so a prebuild never serves a stale template; user files are only validated.
 */
export function applySwiftFilePlans(
  plans: SwiftFilePlan[],
  {
    projectRoot,
    logger,
    targetDirectory,
  }: { projectRoot: string; logger: Logger; targetDirectory: string }
): void {
  const deepenPath = `${targetDirectory}/ios/`;
  for (const plan of plans) {
    if (plan.generate) {
      const content = renderSwiftTemplate(plan.generate);
      warnIfSealedHandEdited({
        filePath: plan.sourcePath,
        plannedContent: content,
        logger,
        userDeepenPath: deepenPath,
      });
      File.writeFileSafe(plan.sourcePath, content);
      continue;
    }

    if (!File.isFile(plan.sourcePath)) {
      throw new Error(
        `Swift file not found: ${plan.sourcePath}\n` +
          `Expected at: ${path.relative(projectRoot, plan.sourcePath)}`
      );
    }
  }
}
