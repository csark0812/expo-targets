import { wireExpoConfig } from './wireExpoConfig';
import { wireMetroConfig } from './wireMetro';
import { ensureExpoTargetsDependency } from './wirePackageJson';

export interface WireHostResult {
  dependencyAdded: boolean;
  expo: {
    ok: boolean;
    pluginAdded?: boolean;
    appGroupAdded?: boolean;
    snippet?: string;
  };
  metro: {
    ok: boolean;
    created?: boolean;
    patched?: boolean;
    snippet?: string;
  };
}

export function wireHost(projectRoot: string): WireHostResult {
  const dependencyAdded = ensureExpoTargetsDependency(projectRoot);
  const expoResult = wireExpoConfig(projectRoot);
  const metroResult = wireMetroConfig(projectRoot);

  return {
    dependencyAdded,
    expo: expoResult.ok
      ? {
          ok: true,
          pluginAdded: expoResult.pluginAdded,
          appGroupAdded: expoResult.appGroupAdded,
        }
      : { ok: false, snippet: expoResult.snippet },
    metro: metroResult.ok
      ? {
          ok: true,
          created: metroResult.created,
          patched: metroResult.patched,
        }
      : { ok: false, snippet: metroResult.snippet },
  };
}

/** Hard-fail only when Metro cannot be wired (app.config.js/ts is soft-fail). */
export function wireHostFailed(result: WireHostResult): boolean {
  return !result.metro.ok;
}

export function printWireFailures(result: WireHostResult): void {
  if (!result.expo.ok && result.expo.snippet) {
    console.warn(
      '\n⚠ Could not auto-patch app config (dynamic app.config.js/ts or missing JSON).'
    );
    console.warn('Add the plugin and App Groups manually:\n');
    console.warn(result.expo.snippet);
    console.warn('\nThen run: npx expo-targets doctor');
  }
  if (!result.metro.ok) {
    console.error('\n✗ Could not wire metro.config.js');
    if (result.metro.snippet) {
      console.error(result.metro.snippet);
    }
  }
}

function wireBulletLines(result: WireHostResult): string[] {
  return [
    result.dependencyAdded
      ? 'Added expo-targets to package.json — run install to fetch it'
      : null,
    result.expo.ok && result.expo.pluginAdded
      ? 'Added expo-targets plugin to app config'
      : null,
    result.expo.ok && result.expo.appGroupAdded
      ? 'Added App Group entitlements to app config'
      : null,
    result.expo.ok
      ? null
      : 'Skipped app config auto-patch (see warning above) — doctor will gate',
    result.metro.ok && result.metro.created
      ? 'Created metro.config.js with withTargets'
      : null,
    result.metro.ok && result.metro.patched
      ? 'Patched metro.config.js to use withTargets'
      : null,
  ].filter((line): line is string => Boolean(line));
}

function logWireBullets(result: WireHostResult): void {
  for (const line of wireBulletLines(result)) {
    console.log(`  • ${line}`);
  }
}

export function printWireSuccess(
  targetName: string,
  result: WireHostResult
): void {
  console.log(`\n✓ Created target: targets/${targetName}/`);
  logWireBullets(result);
  console.log('\nNext steps:');
  if (result.dependencyAdded) {
    console.log('  1. Install dependencies (npm install / bun install / yarn)');
  }
  console.log('  2. npx expo-targets doctor');
  console.log('  3. npx expo prebuild');
  console.log('  4. npx expo run:ios');
}
