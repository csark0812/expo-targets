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

/** Warn when target entries use deprecated global Live Activity factories. */
export function checkLiveActivityHostApi(ctx: ProjectContext): CheckResult[] {
  const results: CheckResult[] = [];

  for (const target of ctx.targets) {
    if (target.config.type !== 'widget') {
      continue;
    }

    const configured = configuredLiveActivityNames(target.config.ios);
    if (configured.length === 0) {
      continue;
    }

    const helper = helperPath(path.dirname(target.configPath));
    if (!helper) {
      continue;
    }

    const source = fs.readFileSync(helper, 'utf8');
    if (usesDeprecatedGlobalLiveActivity(source)) {
      results.push({
        ok: false,
        level: 'warn',
        title: 'Live Activity host API',
        message: `targets/${target.dirName}: prefer createTarget('${target.config.name}').liveActivity('AttributesName') over LiveActivity.create / createLiveActivity / LiveActivity.start in ${path.basename(helper)}.`,
        fix: `export const la = createTarget('${target.config.name}').liveActivity('${configured[0] ?? 'AttributesName'}');`,
      });
      continue;
    }

    const wired = parseLiveActivityHelperNames(helper);
    const covered = new Set(wired);
    const missing = configured.filter((name) => !covered.has(name));
    if (missing.length === 0) {
      continue;
    }

    if (configured.length === 1 && wired.length === 0) {
      if (usesNoArgLiveActivityHelper(source)) {
        continue;
      }
      results.push({
        ok: false,
        level: 'warn',
        title: 'Live Activity host API',
        message: `targets/${target.dirName}: ios.liveActivity is configured but ${path.basename(helper)} does not call .liveActivity().`,
        fix: `Add: export const island = createTarget('${target.config.name}').liveActivity('${configured[0]}');`,
      });
      continue;
    }

    if (missing.length > 0 && configured.length > 1) {
      results.push({
        ok: false,
        level: 'warn',
        title: 'Live Activity host API',
        message: `targets/${target.dirName}: missing .liveActivity(${JSON.stringify(missing[0])}) in ${path.basename(helper)} (configured: ${configured.join(', ')}).`,
        fix: `Add .liveActivity('${missing[0]}') for each ios.liveActivities row.`,
      });
    }
  }

  return results;
}
