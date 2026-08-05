/**
 * Dev mirror of `expo-targets` sync. Prefer `npx expo-targets sync`
 * from the published package.
 */
export interface SyncOptions {
  clean?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  targetsRoot?: string;
}

export async function runSync(options: SyncOptions = {}): Promise<number> {
  // Resolve via package exports at runtime (built cli/build/sync.js).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('expo-targets/cli/sync') as {
    runSync: (opts?: SyncOptions) => Promise<number>;
  };
  return mod.runSync(options);
}
