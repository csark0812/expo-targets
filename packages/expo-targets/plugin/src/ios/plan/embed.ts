import type { ExtensionType } from '../../domain';
import { TYPE_CHARACTERISTICS } from '../../domain';
import type { EmbedPlan } from './types';

/**
 * How the target gets embedded into the host app.
 * `none` covers standalone products such as watch apps.
 */
export function planEmbed(type: ExtensionType): EmbedPlan {
  return { kind: TYPE_CHARACTERISTICS[type].embedType };
}
