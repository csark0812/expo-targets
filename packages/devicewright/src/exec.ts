/**
 * Safe process execution — structured argv only, never shell interpolation.
 */

import { type SpawnSyncOptions, spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

export type ExecResult = {
  status: number;
  stdout: string;
  stderr: string;
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
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {}
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer =
      options.timeoutMs !== null
        ? setTimeout(() => {
            child.kill('SIGKILL');
            reject(
              new Error(`${command} timed out after ${options.timeoutMs}ms`)
            );
          }, options.timeoutMs)
        : null;
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ status: code ?? 1, stdout, stderr });
    });
  });
}
