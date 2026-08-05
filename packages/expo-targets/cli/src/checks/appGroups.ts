import { getAppGroup } from '../../../plugin/build/config';
import { APP_GROUP_ENTITLEMENT_KEY } from '../../../plugin/build/domain';
import { targetNeedsAppGroup } from '../../../plugin/build/ensureHostAppGroups';

import type { CheckResult, ProjectContext } from '../types';

function expectedHostGroup(ctx: ProjectContext): string | null {
  if (ctx.hostAppGroups.length > 0) {
    return ctx.hostAppGroups[0];
  }
  const ios = ctx.expo.ios as Record<string, unknown> | undefined;
  const bundleId = ios?.bundleIdentifier;
  return typeof bundleId === 'string' ? getAppGroup(bundleId) : null;
}

function iosTargetsNeedingGroups(ctx: ProjectContext) {
  return ctx.targets.filter(
    (t) =>
      t.config.platforms?.includes('ios') &&
      targetNeedsAppGroup(t.config.type as never)
  );
}

export function checkAppGroups(ctx: ProjectContext): CheckResult[] {
  const needing = iosTargetsNeedingGroups(ctx);
  if (needing.length === 0) {
    return [];
  }

  const results: CheckResult[] = [];
  const hostGroup = expectedHostGroup(ctx);

  if (ctx.hostAppGroups.length === 0) {
    results.push({
      ok: false,
      level: 'error',
      title: 'App Groups',
      message: `Host is missing ${APP_GROUP_ENTITLEMENT_KEY}`,
      fix:
        'Add to app.json ios.entitlements:\n' +
        `  "${APP_GROUP_ENTITLEMENT_KEY}": ["group.<bundleIdentifier>"]`,
    });
    return results;
  }

  for (const target of needing) {
    const name = target.config.name ?? target.dirName;
    const group = target.config.appGroup ?? hostGroup;
    if (!group) {
      continue;
    }
    if (!ctx.hostAppGroups.includes(group)) {
      results.push({
        ok: false,
        level: 'error',
        title: 'App Groups',
        message: `Target "${name}" uses ${group} but host entitlements do not include it`,
        fix: `Add "${group}" to app.json ios.entitlements.${APP_GROUP_ENTITLEMENT_KEY}`,
      });
    }
  }

  return results;
}
