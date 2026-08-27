import type { CheckResult, ProjectContext } from '../types';

type WidgetTarget = ProjectContext['targets'][number];

function mixedLiveActivityError(dirName: string): CheckResult {
  return {
    ok: false,
    level: 'error',
    title: 'Live Activity config',
    message: `targets/${dirName}: use ios.liveActivities OR ios.liveActivity, not both.`,
    fix: 'Move all Live Activity rows onto ios.liveActivities, or keep a single ios.liveActivity object.',
  };
}

function duplicateAttributesError(dirName: string, name: string): CheckResult {
  return {
    ok: false,
    level: 'error',
    title: 'Live Activity config',
    message: `targets/${dirName}: duplicate ios.liveActivities attributesName "${name}".`,
    fix: 'Use a unique attributesName for each Live Activity in the target.',
  };
}

function firstDuplicateName(names: string[]): string | undefined {
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      return name;
    }
    seen.add(name);
  }
}

function widgetLiveActivityErrors(target: WidgetTarget): CheckResult[] {
  const ios = target.config.ios;
  const hasSingular = Boolean(ios?.liveActivity?.attributesName);
  const hasArray = Boolean(ios?.liveActivities?.length);
  if (hasSingular && hasArray) {
    return [mixedLiveActivityError(target.dirName)];
  }
  const names = (ios?.liveActivities ?? [])
    .map((row) => row.attributesName)
    .filter((name): name is string => Boolean(name));
  const duplicate = firstDuplicateName(names);
  if (duplicate) {
    return [duplicateAttributesError(target.dirName, duplicate)];
  }
  return [];
}

/** Fail when a widget mixes singular and array Live Activity config. */
export function checkLiveActivitiesConfig(ctx: ProjectContext): CheckResult[] {
  return ctx.targets
    .filter((target) => target.config.type === 'widget')
    .flatMap(widgetLiveActivityErrors);
}
