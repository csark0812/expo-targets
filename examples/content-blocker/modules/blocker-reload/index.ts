import { requireNativeModule } from 'expo-modules-core';

type Native = {
  reload(identifier: string): Promise<string>;
  ruleCount(): number;
};

/** Must match targets/content-blocker/ios/blockerList.json length. */
export const BLOCKER_RULE_COUNT = 4;

export const BLOCKER_IDENTIFIER =
  'com.expotargets.example.content-blocker.content-blocker';

function getNative(): Native | null {
  try {
    return requireNativeModule<Native>('BlockerReload');
  } catch {
    return null;
  }
}

export function getRuleCount(): number {
  try {
    return getNative()?.ruleCount() ?? BLOCKER_RULE_COUNT;
  } catch {
    return BLOCKER_RULE_COUNT;
  }
}

export async function reloadContentBlocker(
  identifier = BLOCKER_IDENTIFIER
): Promise<string> {
  const native = getNative();
  if (!native) {
    return 'reloaded-stub';
  }
  return native.reload(identifier);
}
