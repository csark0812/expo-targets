/**
 * Safe process execution — structured argv only, never shell interpolation.
 */

import {
  type ChildProcess,
  type SpawnSyncOptions,
  spawn,
  spawnSync,
} from 'node:child_process';
import process from 'node:process';

export type ExecResult = {
  status: number;
  stdout: string;
  stderr: string;
};

export type RunAsyncOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  signal?: AbortSignal;
  onSpawn?: (child: ChildProcess) => void;
};

export function runSync(
  command: string,
  args: string[],
  options: SpawnSyncOptions = {}
): ExecResult {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });
  return {
    status: result.status ?? 1,
    stdout: (result.stdout as string) || '',
    stderr: (result.stderr as string) || '',
  };
}

export function runSyncOrThrow(
  command: string,
  args: string[],
  options: SpawnSyncOptions = {}
): string {
  const result = runSync(command, args, options);
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (${result.status}): ${
        result.stderr || result.stdout || 'unknown'
      }`
    );
  }
  return result.stdout;
}

export async function runAsync(
  command: string,
  args: string[],
  options: RunAsyncOptions = {}
): Promise<ExecResult> {
  if (options.signal?.aborted) {
    throw abortError(command);
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    options.onSpawn?.(child);

    let stdout = '';
    let stderr = '';
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
      fn();
    };

    const onAbort = () => {
      child.kill('SIGKILL');
      settle(() => reject(abortError(command)));
    };

    const timer =
      options.timeoutMs !== undefined
        ? setTimeout(() => {
            child.kill('SIGKILL');
            settle(() =>
              reject(
                new Error(`${command} timed out after ${options.timeoutMs}ms`)
              )
            );
          }, options.timeoutMs)
        : null;

    options.signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      settle(() => reject(err));
    });
    child.on('close', (code) => {
      settle(() => resolve({ status: code ?? 1, stdout, stderr }));
    });
  });
}

function abortError(command: string): Error {
  const err = new Error(`${command} aborted`);
  err.name = 'AbortError';
  return err;
}
