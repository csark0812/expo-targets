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

function parseCreateTargetNames(filePath: string): string[] {
  const source = fs.readFileSync(filePath, 'utf8');
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const found: string[] = [];
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
        found.push(name);
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

function galleryKindNames(target: {
  config: {
    ios?: { kinds?: { type?: string; name?: string }[] };
    name?: string;
  };
}): string[] {
  const kinds = (target.config.ios?.kinds ?? []).filter(
    (kind) => kind.type !== 'live-activity' && kind.name
  );
  if (kinds.length > 0) {
    return kinds.map((kind) => kind.name as string);
  }
  return target.config.name ? [target.config.name] : [];
}

export function checkNameSync(ctx: ProjectContext): CheckResult[] {
  const failures: CheckResult[] = [];

  for (const target of ctx.targets) {
    const result = checkOneNameSync(target);
    if (result) {
      failures.push(result);
    }
  }

  return failures;
}

function checkOneNameSync(
  target: ProjectContext['targets'][number]
): CheckResult | undefined {
  const configName = target.config.name;
  if (!configName) {
    return {
      ok: false,
      level: 'error',
      title: 'Name sync',
      message: `targets/${target.dirName}: missing "name" in expo-target.config`,
      fix: 'Set "name" to match createTarget(\'...\') in the target index file',
    };
  }

  const helper = helperPath(path.dirname(target.configPath));
  if (!helper) {
    return;
  }

  const createNames = parseCreateTargetNames(helper);
  if (createNames.length === 0) {
    return {
      ok: false,
      level: 'error',
      title: 'Name sync',
      message: `targets/${target.dirName}: could not find createTarget('...') in ${path.basename(helper)}`,
      fix: `Add: export const x = createTarget('${configName}');`,
    };
  }

  const expected = galleryKindNames(target);
  const missing = expected.filter((name) => !createNames.includes(name));
  if (missing.length === 0) {
    return;
  }

  return {
    ok: false,
    level: 'error',
    title: 'Name sync',
    message: `targets/${target.dirName}: ios.kinds / name ${JSON.stringify(missing)} missing createTarget(...) in ${path.basename(helper)} (found ${JSON.stringify(createNames)})`,
    fix: `Add createTarget('${missing[0]}', Layout) for each gallery kind`,
  };
}
