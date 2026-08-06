import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type {
  Expression,
  MemberExpression,
  OptionalMemberExpression,
} from '@babel/types';

import type { CheckResult, ProjectContext } from '../types';

function memberName(
  node: MemberExpression | OptionalMemberExpression
): string | null {
  if (
    node.object.type === 'Identifier' &&
    node.object.name === 'Targets' &&
    !node.computed &&
    node.property.type === 'Identifier'
  ) {
    return node.property.name;
  }
  if (
    node.object.type === 'Identifier' &&
    node.object.name === 'Targets' &&
    node.computed &&
    node.property.type === 'StringLiteral'
  ) {
    return node.property.value;
  }
  return null;
}

function parseCreateTargetArg(arg: Expression): string | null {
  if (arg.type === 'StringLiteral') {
    return arg.value;
  }
  if (
    arg.type === 'MemberExpression' ||
    arg.type === 'OptionalMemberExpression'
  ) {
    return memberName(arg);
  }
  return null;
}

function parseCreateTargetName(filePath: string): string | null {
  const source = fs.readFileSync(filePath, 'utf8');
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  let found: string | null = null;
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type !== 'Identifier' || callee.name !== 'createTarget') {
        return;
      }
      const arg = path.node.arguments[0] as Expression | undefined;
      if (!arg) {
        return;
      }
      const name = parseCreateTargetArg(arg);
      if (name) {
        found = name;
      }
    },
  });

  return found;
}

function helperPath(targetDir: string): string | null {
  for (const name of ['index.ts', 'index.tsx', 'index.js', 'index.jsx']) {
    const candidate = path.join(targetDir, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function checkNameSync(ctx: ProjectContext): CheckResult[] {
  const failures: CheckResult[] = [];

  for (const target of ctx.targets) {
    const configName = target.config.name;
    if (!configName) {
      failures.push({
        ok: false,
        level: 'error',
        title: 'Name sync',
        message: `targets/${target.dirName}: missing "name" in expo-target.config`,
        fix: 'Set "name" to match createTarget(\'...\') in the target index file',
      });
      continue;
    }

    const helper = helperPath(path.dirname(target.configPath));
    if (!helper) {
      continue;
    }

    const createName = parseCreateTargetName(helper);
    if (!createName) {
      failures.push({
        ok: false,
        level: 'error',
        title: 'Name sync',
        message: `targets/${target.dirName}: could not find createTarget('...') in ${path.basename(helper)}`,
        fix: `Add: export const x = createTarget('${configName}');`,
      });
      continue;
    }

    if (createName === configName) {
      continue;
    }

    failures.push({
      ok: false,
      level: 'error',
      title: 'Name sync',
      message: `targets/${target.dirName}: config name "${configName}" ≠ createTarget('${createName}')`,
      fix: `Align expo-target.config "name" and createTarget('${configName}')`,
    });
  }

  return failures;
}
