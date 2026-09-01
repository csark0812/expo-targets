import {
  APP_GROUP_ENTITLEMENT_KEY,
  EAS_APP_GROUP_TYPES,
  type ExtensionType,
  shouldUseAppGroups,
} from '../../../plugin/build/domain';
import type { CheckResult, ProjectContext } from '../types';

const APP_GROUP_KEY = APP_GROUP_ENTITLEMENT_KEY;

type AppExtensionRow = {
  targetName?: string;
  bundleIdentifier?: string;
  entitlements?: Record<string, unknown>;
};

/** Mirror plugin `Paths.sanitizeTargetName` (Xcode product / EAS targetName). */
function sanitizeTargetName(name: string): string {
  return `${name.replace(/[^a-zA-Z0-9]/g, '')}Target`;
}

/** Same input as `withIOSTarget`: config `name` (displayName is CFBundle only). */
function productNameForTarget(
  target: ProjectContext['targets'][number]
): string {
  const configName = target.config.name as string;
  return sanitizeTargetName(configName);
}

function readAppExtensions(
  expo: Record<string, unknown>
): AppExtensionRow[] | null {
  const extra = expo.extra as Record<string, unknown> | undefined;
  const eas = extra?.eas as Record<string, unknown> | undefined;
  const build = eas?.build as Record<string, unknown> | undefined;
  const experimental = build?.experimental as
    | Record<string, unknown>
    | undefined;
  const ios = experimental?.ios as Record<string, unknown> | undefined;
  const rows = ios?.appExtensions;
  if (!Array.isArray(rows)) {
    return null;
  }
  return rows as AppExtensionRow[];
}

function iosTargets(ctx: ProjectContext) {
  return ctx.targets.filter(
    (t) =>
      Boolean(t.config.name) &&
      (!t.config.platforms || t.config.platforms.includes('ios'))
  );
}

function missingBundleIdError(): CheckResult {
  return {
    ok: false,
    level: 'error',
    title: 'EAS / signing',
    message:
      'iOS targets exist but host ios.bundleIdentifier is missing — EAS cannot derive extension App IDs',
    fix: 'Set expo.ios.bundleIdentifier in app config (e.g. com.yourcompany.app)',
  };
}

function missingExtensionWarn(
  productName: string,
  configName: string
): CheckResult {
  return {
    ok: false,
    level: 'warn',
    title: 'EAS / signing',
    message: `Committed appExtensions is missing "${productName}" (target ${configName})`,
    fix:
      'Run npx expo prebuild so the expo-targets plugin can write\n' +
      '  extra.eas.build.experimental.ios.appExtensions\n' +
      'See https://docs.expo.dev/build-reference/app-extensions/',
  };
}

function wrongProductNameError(
  rowName: string,
  productName: string,
  configName: string
): CheckResult {
  return {
    ok: false,
    level: 'error',
    title: 'EAS / signing',
    message: `appExtensions targetName "${rowName}" ≠ sanitized product "${productName}"`,
    fix: `Use targetName: "${productName}" (Xcode product name) for target ${configName}`,
  };
}

function targetUsesAppGroupsForEas(
  type: ExtensionType | undefined,
  appGroup: unknown
): boolean {
  if (typeof appGroup === 'string' && appGroup.length > 0) {
    return true;
  }
  return Boolean(type && shouldUseAppGroups(type));
}

function checkExtensionRow(
  target: ProjectContext['targets'][number],
  row: AppExtensionRow | undefined,
  hostAppGroups: string[]
): CheckResult[] {
  const configName = target.config.name as string;
  const productName = productNameForTarget(target);
  if (!row) {
    return [missingExtensionWarn(productName, configName)];
  }

  const results: CheckResult[] = [];
  if (row.targetName && row.targetName !== productName) {
    results.push(
      wrongProductNameError(row.targetName, productName, configName)
    );
  }

  const type = target.config.type as ExtensionType | undefined;
  if (
    type &&
    EAS_APP_GROUP_TYPES.includes(type) &&
    hostAppGroups.length > 0 &&
    targetUsesAppGroupsForEas(type, target.config.appGroup)
  ) {
    const groups = row.entitlements?.[APP_GROUP_KEY];
    const hasGroups = Array.isArray(groups) && groups.length > 0;
    if (!hasGroups) {
      results.push({
        ok: false,
        level: 'warn',
        title: 'EAS / signing',
        message: `appExtensions entry for ${productName} is missing App Group entitlements`,
        fix: `Ensure ${APP_GROUP_KEY} is present on that extension's EAS entitlements (plugin adds this on prebuild)`,
      });
    }
  }

  if (type === 'wallet' || type === 'wallet-ui') {
    results.push({
      ok: false,
      level: 'warn',
      title: 'EAS / signing',
      message: `Wallet target ${configName}: payment-pass-provisioning is Apple allow-listed — not auto-provisioned by EAS`,
      fix: 'Configure Pass Type IDs / allow-list in Apple Developer Portal manually',
    });
  }

  return results;
}

function deviceAppGroupHint(): CheckResult {
  return {
    ok: false,
    level: 'warn',
    title: 'EAS / signing',
    message:
      'Physical devices need the App Group capability on the provisioning profile (Simulator does not)',
    fix: 'Apple Developer → Identifiers → App Groups, then regenerate profiles / let EAS manage credentials',
  };
}

export function checkEasCredentials(ctx: ProjectContext): CheckResult[] {
  const targets = iosTargets(ctx);
  if (targets.length === 0) {
    return [];
  }

  const ios = ctx.expo.ios as { bundleIdentifier?: string } | undefined;
  if (!ios?.bundleIdentifier) {
    return [missingBundleIdError()];
  }

  const results: CheckResult[] = [];
  const appExtensions = readAppExtensions(ctx.expo);
  if (appExtensions) {
    for (const target of targets) {
      const configName = target.config.name as string;
      const productName = productNameForTarget(target);
      const row = appExtensions.find(
        (ext) => ext.targetName === productName || ext.targetName === configName
      );
      results.push(...checkExtensionRow(target, row, ctx.hostAppGroups));
    }
  }

  if (ctx.hostAppGroups.length > 0) {
    results.push(deviceAppGroupHint());
  }

  return results;
}

export function checkEasCredentialErrors(ctx: ProjectContext): CheckResult[] {
  return checkEasCredentials(ctx).filter((r) => r.level === 'error');
}

export function checkEasCredentialWarnings(ctx: ProjectContext): CheckResult[] {
  return checkEasCredentials(ctx).filter((r) => r.level === 'warn');
}
