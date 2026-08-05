import path from 'node:path';
import fs from 'fs-extra';

export function ensureExpoTargetsDependency(projectRoot: string): boolean {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return false;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const deps = pkg.dependencies ?? {};
  if (deps['expo-targets']) {
    return false;
  }

  pkg.dependencies = { ...deps, 'expo-targets': '*' };
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  return true;
}
