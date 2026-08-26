import type { CheckResult, ProjectContext } from '../types';

/** Fail when a widget mixes singular and array Live Activity config. */
export function checkLiveActivitiesConfig(ctx: ProjectContext): CheckResult[] {
  const errors: CheckResult[] = [];
  for (const target of ctx.targets) {
    if (target.config.type !== 'widget') {
      continue;
    }
    const ios = target.config.ios;
    const hasSingular = Boolean(ios?.liveActivity?.attributesName);
    const hasArray = Boolean(ios?.liveActivities?.length);
    if (hasSingular && hasArray) {
      errors.push({
        ok: false,
        level: 'error',
        title: 'Live Activity config',
        message: `targets/${target.dirName}: use ios.liveActivities OR ios.liveActivity, not both.`,
        fix: 'Move all Live Activity rows onto ios.liveActivities, or keep a single ios.liveActivity object.',
      });
      continue;
    }
    const names = (ios?.liveActivities ?? [])
      .map((row) => row.attributesName)
      .filter((name): name is string => Boolean(name));
    const seen = new Set<string>();
    for (const name of names) {
      if (seen.has(name)) {
        errors.push({
          ok: false,
          level: 'error',
          title: 'Live Activity config',
          message: `targets/${target.dirName}: duplicate ios.liveActivities attributesName "${name}".`,
          fix: 'Use a unique attributesName for each Live Activity in the target.',
        });
        break;
      }
      seen.add(name);
    }
  }
  return errors;
}
