import path from 'node:path';
import process from 'node:process';
import fs from 'fs-extra';

/**
 * Resolve android.package from app.json / app.config.json.
 */
export function resolveAndroidPackage(
  projectRoot: string = process.cwd()
): string {
  for (const name of ['app.json', 'app.config.json']) {
    const filePath = path.join(projectRoot, name);
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<
        string,
        unknown
      >;
      const root =
        raw.expo && typeof raw.expo === 'object'
          ? (raw.expo as Record<string, unknown>)
          : raw;
      const android = root.android as Record<string, unknown> | undefined;
      if (typeof android?.package === 'string' && android.package.length > 0) {
        return android.package;
      }
    } catch {
      // ignore
    }
  }
  return 'com.example.app';
}
