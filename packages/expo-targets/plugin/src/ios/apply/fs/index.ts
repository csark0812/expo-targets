/**
 * Apply layer: file system writes.
 *
 * Each module writes one kind of artifact from its plan. Nothing here decides
 * what should be written.
 */

export { applyFsTargetPlan } from './applyTargetPlan';
export { applyAssetPlan } from './assets';
export { writeEntitlements } from './entitlements';
export { writeInfoPlist } from './infoPlist';
export { applySafariResourcesPlan } from './safari';
export { applyStickersPlan } from './stickers';
export { applySwiftFilePlans } from './swift';
