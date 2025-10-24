import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import fs from 'fs';
import path from 'path';

import type { TargetConfig } from './config';

export function parseTargetConfigFromFile(filePath: string): TargetConfig {
  const code = fs.readFileSync(filePath, 'utf-8');
  const directoryName = path.basename(path.dirname(filePath));

  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  let targetConfig: TargetConfig | null = null;

  traverse(ast, {
    CallExpression(path) {
      const { node } = path;

      if (
        t.isIdentifier(node.callee) &&
        node.callee.name === 'defineTarget' &&
        node.arguments.length > 0
      ) {
        const firstArg = node.arguments[0];

        if (t.isObjectExpression(firstArg)) {
          targetConfig = evaluateObjectExpression(firstArg);
        }
      }
    },
  });

  if (!targetConfig) {
    throw new Error(
      `No defineTarget() call found in ${filePath}. Make sure you export a target using defineTarget().`
    );
  }

  // Cast to any to work with discriminated union
  const config = targetConfig as any;

  // Validate name is specified
  if (!config.name) {
    throw new Error(
      `Target in ${filePath} must specify 'name' property in defineTarget() configuration.`
    );
  }

  // Validate platforms array
  if (
    !config.platforms ||
    !Array.isArray(config.platforms) ||
    config.platforms.length === 0
  ) {
    throw new Error(
      `Target '${config.name}' must specify platforms array (e.g., platforms: ['ios'])`
    );
  }

  return config as TargetConfig;
}

function evaluateObjectExpression(node: t.ObjectExpression): any {
  const obj: any = {};

  for (const prop of node.properties) {
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
      const key = prop.key.name;
      obj[key] = evaluateNode(prop.value);
    } else if (t.isObjectProperty(prop) && t.isStringLiteral(prop.key)) {
      const key = prop.key.value;
      obj[key] = evaluateNode(prop.value);
    }
  }

  return obj;
}

function evaluateNode(node: t.Node): any {
  if (t.isStringLiteral(node)) {
    return node.value;
  }

  if (t.isNumericLiteral(node)) {
    return node.value;
  }

  if (t.isBooleanLiteral(node)) {
    return node.value;
  }

  if (t.isNullLiteral(node)) {
    return null;
  }

  if (t.isObjectExpression(node)) {
    return evaluateObjectExpression(node);
  }

  if (t.isArrayExpression(node)) {
    return node.elements.map((el) => (el ? evaluateNode(el) : null));
  }

  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }

  console.warn(`[expo-targets] Unable to evaluate node type: ${node.type}`);
  return undefined;
}
