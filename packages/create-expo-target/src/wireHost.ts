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

export function printWireSuccess(
  targetName: string,
  result: WireHostResult
): void {
  console.log(`\n✓ Created target: targets/${targetName}/`);

  if (result.dependencyAdded) {
    console.log(
      '  • Added expo-targets to package.json — run install to fetch it'
    );
  }
  if (result.expo.ok && result.expo.pluginAdded) {
    console.log('  • Added expo-targets plugin to app config');
  }
  if (result.expo.ok && result.expo.appGroupAdded) {
    console.log('  • Added App Group entitlements to app config');
  }
  if (result.metro.ok && result.metro.created) {
    console.log('  • Created metro.config.js with withTargets');
  }
  if (result.metro.ok && result.metro.patched) {
    console.log('  • Patched metro.config.js to use withTargets');
  }

  console.log('\nNext steps:');
  if (result.dependencyAdded) {
    console.log('  1. Install dependencies (npm install / bun install / yarn)');
  }
  console.log('  2. npx expo-targets doctor');
  console.log('  3. npx expo prebuild');
  console.log('  4. npx expo run:ios');
}

export function printWireFailures(result: WireHostResult): void {
  if (!result.expo.ok && result.expo.snippet) {
    console.error('\nCould not patch app config automatically:\n');
    console.error(result.expo.snippet);
  }
  if (!result.metro.ok && result.metro.snippet) {
    console.error('\nCould not patch metro.config.js automatically. Use:\n');
    console.error(result.metro.snippet);
  }
}

export function wireHostFailed(result: WireHostResult): boolean {
  return !(result.expo.ok && result.metro.ok);
}
