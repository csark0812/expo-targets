/**
 * Apply layer: Podfile edits.
 *
 * `podfile.ts` holds the string transformations; `scan.ts` reads target blocks
 * back out of a Podfile so the plugin can post-process what it wrote.
 */

export { applyPodfilePlan } from './applyPodfilePlan';
export * from './podfile';
export type { PodfileTargetRef } from './scan';
export {
  findReactNativeExtensionTargets,
  findStandaloneExtensionTargets,
  highestDeploymentTarget,
} from './scan';
