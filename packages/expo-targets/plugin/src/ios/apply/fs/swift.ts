import path from 'node:path';

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
  { projectRoot }: { projectRoot: string }
): void {
  for (const plan of plans) {
    if (plan.generate) {
      File.writeFileSafe(plan.sourcePath, renderSwiftTemplate(plan.generate));
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
