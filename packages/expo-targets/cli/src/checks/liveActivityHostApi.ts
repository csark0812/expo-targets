import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

import type { CheckResult, ProjectContext } from '../types';

function helperPath(targetDir: string): string | null {
  for (const name of ['index.ts', 'index.tsx', 'index.js', 'index.jsx']) {
    const candidate = path.join(targetDir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function configuredLiveActivityNames(
  ios?: ProjectContext['targets'][number]['config']['ios']
): string[] {
  const fromArray = (ios?.liveActivities ?? [])
    .map((row) => row.attributesName)
    .filter((name): name is string => Boolean(name));
  const singular = ios?.liveActivity?.attributesName
    ? [ios.liveActivity.attributesName]
    : [];
  return fromArray.length > 0 ? fromArray : singular;
}

function usesDeprecatedGlobalLiveActivity(source: string): boolean {
  if (
    /\bLiveActivity\.create\s*\(/.test(source) ||
    /\bcreateLiveActivity\s*\(/.test(source)
  ) {
    return true;
  }
  if (/\bLiveActivity\.start\s*\(/.test(source)) {
    return true;
  }
  return false;
}

function usesNoArgLiveActivityHelper(source: string): boolean {
  return /\.liveActivity\s*\(\s*\)/.test(source);
}

function parseLiveActivityHelperNames(filePath: string): string[] {
  const source = fs.readFileSync(filePath, 'utf8');
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const names: string[] = [];

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (
        !(
          (callee.type === 'MemberExpression' ||
            callee.type === 'OptionalMemberExpression') &&
          !callee.computed &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'liveActivity'
        )
      ) {
        return;
      }
      const arg = path.node.arguments[0];
      if (arg?.type === 'StringLiteral') {
        names.push(arg.value);
      }
    },
  });

  return names;
}

function warnDeprecatedGlobal(
  target: ProjectContext['targets'][number],
  helper: string,
  configured: string[]
): CheckResult {
  return {
    ok: false,
    level: 'warn',
    title: 'Live Activity host API',
    message: `targets/${target.dirName}: prefer createTarget('${target.config.name}').liveActivity('AttributesName') over LiveActivity.create / createLiveActivity / LiveActivity.start in ${path.basename(helper)}.`,
    fix: `export const la = createTarget('${target.config.name}').liveActivity('${configured[0] ?? 'AttributesName'}');`,
  };
}

function warnSingularHelperMissing(
  target: ProjectContext['targets'][number],
  helper: string,
  attributesName: string
): CheckResult {
  return {
    ok: false,
    level: 'warn',
    title: 'Live Activity host API',
    message: `targets/${target.dirName}: ios.liveActivity is configured but ${path.basename(helper)} does not call .liveActivity().`,
    fix: `Add: export const island = createTarget('${target.config.name}').liveActivity('${attributesName}');`,
  };
}

function warnMultiHelperMissing(
  target: ProjectContext['targets'][number],
  helper: string,
  names: { configured: string[]; missing: string[] }
): CheckResult {
  return {
    ok: false,
    level: 'warn',
    title: 'Live Activity host API',
    message: `targets/${target.dirName}: missing .liveActivity(${JSON.stringify(names.missing[0])}) in ${path.basename(helper)} (configured: ${names.configured.join(', ')}).`,
    fix: `Add .liveActivity('${names.missing[0]}') for each ios.liveActivities row.`,
  };
}

function checkWidgetLiveActivityHost(
  target: ProjectContext['targets'][number]
): CheckResult[] {
  const configured = configuredLiveActivityNames(target.config.ios);
  if (configured.length === 0) {
    return [];
  }
  const helper = helperPath(path.dirname(target.configPath));
  if (!helper) {
    return [];
  }
  const source = fs.readFileSync(helper, 'utf8');
  if (usesDeprecatedGlobalLiveActivity(source)) {
    return [warnDeprecatedGlobal(target, helper, configured)];
  }
  const wired = parseLiveActivityHelperNames(helper);
  const covered = new Set(wired);
  const missing = configured.filter((name) => !covered.has(name));
  if (missing.length === 0) {
    return [];
  }
  if (configured.length === 1 && wired.length === 0) {
    if (usesNoArgLiveActivityHelper(source)) {
      return [];
    }
    return [warnSingularHelperMissing(target, helper, configured[0] ?? '')];
  }
  if (configured.length > 1) {
    return [warnMultiHelperMissing(target, helper, { configured, missing })];
  }
  return [];
}

/** Warn when target entries use deprecated global Live Activity factories. */
export function checkLiveActivityHostApi(ctx: ProjectContext): CheckResult[] {
  return ctx.targets
    .filter((target) => target.config.type === 'widget')
    .flatMap(checkWidgetLiveActivityHost);
}
