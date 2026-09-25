import { createRequire } from 'node:module';
import path from 'node:path';
import { createJiti } from 'jiti';

const nodeRequire = createRequire(__filename);

type TypescriptLoader = (id: string) => unknown;

let typescriptLoader: TypescriptLoader | undefined;

/**
 * Load `.ts` target configs without Node's type-stripping flag.
 * EAS pins Node 22.13, where `require()` of a `.ts` file throws
 * `SyntaxError: Unexpected token '{'` unless that flag is set.
 * jiti strips the types in this process, so apps do not set NODE_OPTIONS.
 */
function loadTypescriptModule(targetPath: string): unknown {
  if (!typescriptLoader) {
    typescriptLoader = createJiti(__filename, {
      fsCache: false,
      tryNative: false,
    });
  }

  try {
    return typescriptLoader(path.resolve(targetPath));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const wrapped = new Error(
      `Could not load ${targetPath}. TypeScript target configs do not need NODE_OPTIONS. ${reason}`
    );
    if (error instanceof Error) {
      wrapped.cause = error;
    }
    throw wrapped;
  }
}

export function loadTargetConfigModule(targetPath: string): unknown {
  if (path.extname(targetPath) === '.ts') {
    return loadTypescriptModule(targetPath);
  }
  return nodeRequire(targetPath);
}

export function evaluateTargetConfigModule(
  targetPath: string,
  expoConfig: unknown
): any {
  let evaluatedConfig = loadTargetConfigModule(targetPath) as any;

  if (evaluatedConfig?.default) {
    evaluatedConfig = evaluatedConfig.default;
  }

  if (typeof evaluatedConfig === 'function') {
    evaluatedConfig = evaluatedConfig(expoConfig);
  }

  return evaluatedConfig;
}
