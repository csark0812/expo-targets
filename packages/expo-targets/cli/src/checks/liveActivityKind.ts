import type { CheckResult, ProjectContext } from '../types';

function hasLiveActivityKind(kinds: { type?: string }[] | undefined): boolean {
  return Boolean(kinds?.some((kind) => kind.type === 'live-activity'));
}

/** Fail when a widget still lists Live Activity inside ios.kinds. */
export function checkLiveActivityKind(ctx: ProjectContext): CheckResult[] {
  const errors: CheckResult[] = [];
  for (const target of ctx.targets) {
    if (target.config.type !== 'widget') {
      continue;
    }
    if (!hasLiveActivityKind(target.config.ios?.kinds)) {
      continue;
    }
    errors.push({
      ok: false,
      level: 'error',
      title: 'Live Activity kinds row',
      message: `targets/${target.dirName}: ios.kinds cannot contain { "type": "live-activity" }. Set ios.liveActivity or ios.liveActivities instead.`,
      fix: 'Keep ios.kinds as gallery WidgetKit products only. Put attributesName, static, contentState, and pushType on ios.liveActivity or ios.liveActivities.',
    });
  }
  return errors;
}
