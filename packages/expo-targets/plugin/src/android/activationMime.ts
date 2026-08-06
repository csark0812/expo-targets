import type { ShareExtensionActivationRule } from '../config';

const TYPE_TO_MIME: Record<string, string[]> = {
  text: ['text/plain'],
  url: ['text/plain'],
  webpage: ['text/plain'],
  image: ['image/*'],
  video: ['video/*'],
  file: ['*/*'],
};

export type AndroidShareMimePlan = {
  singleMimes: string[];
  multipleMimes: string[];
};

/**
 * Map iOS-style activationRules to Android SEND / SEND_MULTIPLE MIME types.
 */
export function mimePlanFromActivationRules(
  rules: ShareExtensionActivationRule[] | undefined
): AndroidShareMimePlan {
  const effective =
    rules && rules.length > 0
      ? rules
      : ([{ type: 'text' }, { type: 'url' }] as ShareExtensionActivationRule[]);

  const single = new Set<string>();
  const multiple = new Set<string>();

  for (const rule of effective) {
    const mimes = TYPE_TO_MIME[rule.type] ?? ['*/*'];
    for (const mime of mimes) {
      single.add(mime);
      if ((rule.maxCount ?? 1) > 1) {
        multiple.add(mime);
      }
    }
  }

  return {
    singleMimes: [...single],
    multipleMimes: [...multiple],
  };
}

export function sanitizeTargetSegment(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function toPascalName(name: string): string {
  return (
    name.charAt(0).toUpperCase() +
    name
      .slice(1)
      .replace(/[-_]([a-z])/g, (_, letter: string) => letter.toUpperCase())
  );
}
