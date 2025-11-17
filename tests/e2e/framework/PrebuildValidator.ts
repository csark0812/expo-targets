import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import type { ValidationResult } from './types.js';

export class PrebuildValidator {
  async validateProjectStructure(
    projectPath: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const iosPath = path.join(projectPath, 'ios');
    try {
      await fs.access(iosPath);
    } catch {
      errors.push('ios/ directory not found');
      return { valid: false, errors, warnings };
    }

    const xcodeProjects = await glob('*.xcodeproj', { cwd: iosPath });
    const xcworkspaces = await glob('*.xcworkspace', { cwd: iosPath });

    if (xcodeProjects.length === 0 && xcworkspaces.length === 0) {
      errors.push('No Xcode project or workspace found');
    }

    if (xcworkspaces.length === 0) {
      warnings.push('No workspace found - CocoaPods may not be integrated');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateTarget(
    projectPath: string,
    targetName: string,
    targetType: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // New architecture: targets are in targets/ directory, not ios/*Target
    // Check for target config file first
    const targetsDir = path.join(projectPath, 'targets');
    let targetConfigFiles: string[] = [];
    try {
      await fs.access(targetsDir);
      targetConfigFiles = await glob('*/expo-target.config.*', {
        cwd: targetsDir,
      });
    } catch {
      // targets/ directory doesn't exist, will fall back to old architecture
    }

    // Normalize names for comparison (remove hyphens, underscores, case-insensitive)
    const normalizeName = (name: string) =>
      name.toLowerCase().replace(/[-_]/g, '');
    const normalizedTargetName = normalizeName(targetName);

    const targetConfigFile = targetConfigFiles.find((file) => {
      const dirName = path.dirname(file);
      return (
        normalizeName(dirName).includes(normalizedTargetName) ||
        normalizedTargetName.includes(normalizeName(dirName))
      );
    });

    if (!targetConfigFile) {
      // Fallback: check for old architecture (ios/*Target directories)
      const iosPath = path.join(projectPath, 'ios');
      try {
        await fs.access(iosPath);
        const targetDirs = await glob('*Target', { cwd: iosPath });
        const targetDir = targetDirs.find((dir) =>
          dir.toLowerCase().includes(targetName.toLowerCase())
        );

        if (!targetDir) {
          errors.push(`Target directory not found for ${targetName}`);
          return { valid: false, errors, warnings };
        }

        const targetPath = path.join(iosPath, targetDir);
        const infoPlist = path.join(targetPath, 'Info.plist');

        try {
          await fs.access(infoPlist);
        } catch {
          errors.push(`Info.plist not found for target ${targetName}`);
        }

        if (targetType === 'widget') {
          const intentDefinition = await glob('*.intentdefinition', {
            cwd: targetPath,
          });
          if (intentDefinition.length === 0) {
            warnings.push(
              `No .intentdefinition file found for widget ${targetName}`
            );
          }
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings,
        };
      } catch {
        errors.push(`Target directory not found for ${targetName}`);
        return { valid: false, errors, warnings };
      }
    }

    // New architecture: check targets/{name}/ios/build/Info.plist
    const targetDirName = path.dirname(targetConfigFile);
    const targetBuildPath = path.join(
      targetsDir,
      targetDirName,
      'ios',
      'build'
    );
    const infoPlist = path.join(targetBuildPath, 'Info.plist');

    try {
      await fs.access(infoPlist);
    } catch {
      errors.push(
        `Info.plist not found for target ${targetName} at ${infoPlist}`
      );
    }

    if (targetType === 'widget') {
      const intentDefinition = await glob('*.intentdefinition', {
        cwd: targetBuildPath,
      });
      if (intentDefinition.length === 0) {
        warnings.push(
          `No .intentdefinition file found for widget ${targetName}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateEntitlements(
    projectPath: string,
    targetName: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // New architecture: check targets/{name}/ios/build/generated.entitlements
    const targetsDir = path.join(projectPath, 'targets');
    let targetConfigFiles: string[] = [];
    try {
      await fs.access(targetsDir);
      targetConfigFiles = await glob('*/expo-target.config.*', {
        cwd: targetsDir,
      });
    } catch {
      // targets/ directory doesn't exist, will fall back to old architecture
    }

    // Normalize names for comparison (remove hyphens, underscores, case-insensitive)
    const normalizeName = (name: string) =>
      name.toLowerCase().replace(/[-_]/g, '');
    const normalizedTargetName = normalizeName(targetName);

    const targetConfigFile = targetConfigFiles.find((file) => {
      const dirName = path.dirname(file);
      return (
        normalizeName(dirName).includes(normalizedTargetName) ||
        normalizedTargetName.includes(normalizeName(dirName))
      );
    });

    if (targetConfigFile) {
      const targetDirName = path.dirname(targetConfigFile);
      const entitlementsPath = path.join(
        targetsDir,
        targetDirName,
        'ios',
        'build',
        'generated.entitlements'
      );

      try {
        await fs.access(entitlementsPath);
        const content = await fs.readFile(entitlementsPath, 'utf-8');
        if (!content.includes('com.apple.security.application-groups')) {
          warnings.push(
            `No app groups found in entitlements for ${targetName}`
          );
        }
      } catch {
        warnings.push(
          `No entitlements file found for ${targetName} at ${entitlementsPath}`
        );
      }
    } else {
      // Fallback: check old architecture (ios/**/*.entitlements)
      const iosPath = path.join(projectPath, 'ios');
      try {
        await fs.access(iosPath);
        const entitlementsFiles = await glob('**/*.entitlements', {
          cwd: iosPath,
        });

        const targetEntitlements = entitlementsFiles.find(
          (file) => file.includes(targetName) || file.includes('Target')
        );

        if (!targetEntitlements) {
          warnings.push(`No entitlements file found for ${targetName}`);
        } else {
          const entitlementsPath = path.join(iosPath, targetEntitlements);
          try {
            const content = await fs.readFile(entitlementsPath, 'utf-8');
            if (!content.includes('com.apple.security.application-groups')) {
              warnings.push(
                `No app groups found in entitlements for ${targetName}`
              );
            }
          } catch (error) {
            errors.push(`Failed to read entitlements: ${error}`);
          }
        }
      } catch {
        warnings.push(`No entitlements file found for ${targetName}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateAppGroups(projectPath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const appGroups = new Set<string>();

    // Check new architecture: targets/{name}/ios/build/generated.entitlements
    const targetsDir = path.join(projectPath, 'targets');
    try {
      await fs.access(targetsDir);
      const entitlementsFiles = await glob(
        '**/ios/build/generated.entitlements',
        { cwd: targetsDir }
      );

      for (const file of entitlementsFiles) {
        try {
          const content = await fs.readFile(
            path.join(targetsDir, file),
            'utf-8'
          );
          const groupMatch = content.match(/group\.[a-zA-Z0-9.-]+/g);
          if (groupMatch) {
            groupMatch.forEach((group) => appGroups.add(group));
          }
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // targets/ directory doesn't exist, will check ios/ fallback
    }

    // Also check ios/**/*.entitlements (main app + old architecture)
    const iosPath = path.join(projectPath, 'ios');
    try {
      await fs.access(iosPath);
      const iosEntitlementsFiles = await glob('**/*.entitlements', {
        cwd: iosPath,
      });

      for (const file of iosEntitlementsFiles) {
        try {
          const content = await fs.readFile(path.join(iosPath, file), 'utf-8');
          const groupMatch = content.match(/group\.[a-zA-Z0-9.-]+/g);
          if (groupMatch) {
            groupMatch.forEach((group) => appGroups.add(group));
          }
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // ios/ directory doesn't exist
    }

    if (appGroups.size === 0) {
      errors.push('No app groups configured');
    } else if (appGroups.size > 1) {
      warnings.push(
        `Multiple app groups found: ${Array.from(appGroups).join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateAssets(
    projectPath: string,
    targetName: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const iosPath = path.join(projectPath, 'ios');
    const assetCatalogs = await glob('**/Assets.xcassets', { cwd: iosPath });

    if (assetCatalogs.length === 0) {
      warnings.push('No asset catalogs found');
    }

    for (const catalog of assetCatalogs) {
      const catalogPath = path.join(iosPath, catalog);
      const contents = await fs.readdir(catalogPath);

      const hasColors = contents.some((item) => item.endsWith('.colorset'));
      const hasImages = contents.some((item) => item.endsWith('.imageset'));

      if (!hasColors && !hasImages) {
        warnings.push(`Asset catalog ${catalog} is empty`);
      }
    }

    return {
      valid: true,
      errors,
      warnings,
    };
  }

  async validateAll(
    projectPath: string,
    targetName: string,
    targetType: string
  ): Promise<ValidationResult> {
    const results = await Promise.all([
      this.validateProjectStructure(projectPath),
      this.validateTarget(projectPath, targetName, targetType),
      this.validateEntitlements(projectPath, targetName),
      this.validateAppGroups(projectPath),
      this.validateAssets(projectPath, targetName),
    ]);

    const errors = results.flatMap((r) => r.errors);
    const warnings = results.flatMap((r) => r.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
