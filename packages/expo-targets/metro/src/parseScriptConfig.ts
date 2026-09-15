import { parse } from '@babel/parser';
import type {
  ArrowFunctionExpression,
  Expression,
  File,
  FunctionDeclaration,
  FunctionExpression,
  Node,
  ObjectExpression,
  Statement,
  VariableDeclaration,
} from '@babel/types';

export interface ScriptTargetConfig {
  name?: string;
  entry?: string;
}

function unwrap(node: Node): Node {
  switch (node.type) {
    case 'TSSatisfiesExpression':
    case 'TSAsExpression':
    case 'TSTypeAssertion':
    case 'TSNonNullExpression':
    case 'ParenthesizedExpression':
      return unwrap(node.expression);
    default:
      return node;
  }
}

function stringLiteralValue(node: Node): string | undefined {
  const inner = unwrap(node);
  if (inner.type === 'StringLiteral') {
    return inner.value;
  }
  if (
    inner.type === 'TemplateLiteral' &&
    inner.expressions.length === 0 &&
    inner.quasis[0]
  ) {
    return inner.quasis[0].value.cooked ?? inner.quasis[0].value.raw;
  }
}

type ObjectPropertyNode = ObjectExpression['properties'][number];

function propertyKey(prop: ObjectPropertyNode): string | undefined {
  if (prop.type !== 'ObjectProperty' || prop.computed) {
    return;
  }
  if (prop.key.type === 'Identifier') {
    return prop.key.name;
  }
  if (prop.key.type === 'StringLiteral') {
    return prop.key.value;
  }
}

function stringProps(obj: ObjectExpression): ScriptTargetConfig {
  const config: ScriptTargetConfig = {};
  for (const prop of obj.properties) {
    const key = propertyKey(prop);
    if (!key || (key !== 'name' && key !== 'entry')) {
      continue;
    }
    if (prop.type !== 'ObjectProperty') {
      continue;
    }
    const value = stringLiteralValue(prop.value);
    if (value !== undefined) {
      config[key] = value;
    }
  }
  return config;
}

function objectExpression(node: Node): ObjectExpression | undefined {
  const inner = unwrap(node);
  return inner.type === 'ObjectExpression' ? inner : undefined;
}

type FnNode =
  | FunctionExpression
  | ArrowFunctionExpression
  | FunctionDeclaration;

function objectFromFunction(fn: FnNode): ObjectExpression | undefined {
  if (fn.body.type !== 'BlockStatement') {
    return objectExpression(fn.body);
  }
  for (const stmt of fn.body.body) {
    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      return objectExpression(stmt.argument);
    }
  }
}

function isFunctionNode(node: Node): node is FnNode {
  return (
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration'
  );
}

function objectFromNode(node: Node): ObjectExpression | undefined {
  const inner = unwrap(node);
  const asObject = objectExpression(inner);
  if (asObject) {
    return asObject;
  }
  if (isFunctionNode(inner)) {
    return objectFromFunction(inner);
  }
}

function declarationInit(
  name: string,
  stmt: VariableDeclaration
): Expression | undefined {
  for (const decl of stmt.declarations) {
    if (decl.id.type === 'Identifier' && decl.id.name === name) {
      return decl.init ?? undefined;
    }
  }
}

function bindingObject(
  name: string,
  body: Statement[]
): ObjectExpression | undefined {
  for (const stmt of body) {
    if (stmt.type !== 'VariableDeclaration') {
      continue;
    }
    const init = declarationInit(name, stmt);
    if (init) {
      return objectFromNode(init);
    }
  }
}

function defaultExportObject(body: Statement[]): ObjectExpression | undefined {
  for (const stmt of body) {
    if (stmt.type !== 'ExportDefaultDeclaration') {
      continue;
    }
    const decl = stmt.declaration;
    if (decl.type === 'Identifier') {
      return bindingObject(decl.name, body);
    }
    return objectFromNode(decl);
  }
}

function isModuleExports(node: Node): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object.type === 'Identifier' &&
    node.object.name === 'module' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'exports'
  );
}

function moduleExportsRight(stmt: Statement): Expression | undefined {
  if (stmt.type !== 'ExpressionStatement') {
    return;
  }
  const expr = stmt.expression;
  if (expr.type !== 'AssignmentExpression' || expr.operator !== '=') {
    return;
  }
  if (!isModuleExports(expr.left)) {
    return;
  }
  return expr.right;
}

function cjsExportObject(body: Statement[]): ObjectExpression | undefined {
  for (const stmt of body) {
    const right = moduleExportsRight(stmt);
    if (!right) {
      continue;
    }
    if (right.type === 'Identifier') {
      return bindingObject(right.name, body);
    }
    return objectFromNode(right);
  }
}

function exportedObject(ast: File): ObjectExpression | undefined {
  const body = ast.program.body;
  return defaultExportObject(body) ?? cjsExportObject(body);
}

export function parseScriptTargetConfig(
  source: string
): ScriptTargetConfig | undefined {
  const ast = parse(source, {
    sourceType: 'unambiguous',
    plugins: ['typescript'],
  });
  const obj = exportedObject(ast);
  if (!obj) {
    return;
  }
  return stringProps(obj);
}
