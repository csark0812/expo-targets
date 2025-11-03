import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { execa } from 'execa';
import type { ValidationResult } from './types.js';
import { XcodeHelper } from './XcodeHelper.js';

type ExtensionType =
  | 'widget'
  | 'clip'
  | 'stickers'
  | 'share'
  | 'action'
  | 'safari'
  | 'notification-content'
  | 'notification-service'
  | 'intent'
  | 'intent-ui'
  | 'spotlight'
  | 'bg-download'
  | 'quicklook-thumbnail'
  | 'location-push'
  | 'credentials-provider'
  | 'account-auth'
  | 'app-intent'
  | 'device-activity-monitor'
  | 'matter'
  | 'watch';

const TYPE_MINIMUM_DEPLOYMENT_TARGETS: Record<ExtensionType, string> = {
  widget: '14.0',
  clip: '14.0',
  stickers: '10.0',
  share: '8.0',
  action: '8.0',
  'notification-content': '10.0',
  'notification-service': '10.0',
  intent: '12.0',
  'intent-ui': '12.0',
  safari: '15.0',
  spotlight: '9.0',
  'bg-download': '7.0',
  'quicklook-thumbnail': '11.0',
  'location-push': '15.0',
  'credentials-provider': '12.0',
  'account-auth': '12.2',
  'app-intent': '16.0',
  'device-activity-monitor': '15.0',
  matter: '16.1',
  watch: '2.0',
};

const TYPE_BUNDLE_IDENTIFIER_SUFFIXES: Record<ExtensionType, string> = {
  widget: 'widget',
  clip: 'clip',
  stickers: 'stickers',
  share: 'share',
  action: 'action',
  safari: 'safari',
  'notification-content': 'notification-content',
  'notification-service': 'notification-service',
  intent: 'intent',
  'intent-ui': 'intent-ui',
  spotlight: 'spotlight',
  'bg-download': 'bg-download',
  'quicklook-thumbnail': 'quicklook-thumbnail',
  'location-push': 'location-push',
  'credentials-provider': 'credentials-provider',
  'account-auth': 'account-auth',
  'app-intent': 'app-intent',
  'device-activity-monitor': 'device-activity-monitor',
  matter: 'matter',
  watch: 'watch',
};

export class TargetTypeTester {
  private xcodeHelper: XcodeHelper;

  constructor() {
    this.xcodeHelper = new XcodeHelper();
  }

  async validateTargetType(
    type: ExtensionType,
    fixturePath: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const iosPath = path.join(fixturePath, 'ios');
    try {
      await fs.access(iosPath);
    } catch {
      errors.push(`ios/ directory not found for ${type}`);
      return { valid: false, errors, warnings };
    }

    const project = await this.xcodeHelper.findProject(iosPath).catch(() => null);
    if (!project) {
      errors.push(`Xcode project not found for ${type}`);
      return { valid: false, errors, warnings };
    }

    const targetDirs = await glob('*Target', { cwd: iosPath });
    if (targetDirs.length === 0) {
      errors.push(`No target directories found for ${type}`);
    }

    const bundleIdSuffix = TYPE_BUNDLE_IDENTIFIER_SUFFIXES[type];
    if (!bundleIdSuffix) {
      errors.push(`Unknown target type: ${type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async testMinimumDeploymentTarget(
    type: ExtensionType,
    projectPath: string
  ): Promise<boolean> {
    const expectedTarget = TYPE_MINIMUM_DEPLOYMENT_TARGETS[type];
    if (!expectedTarget) {
      return false;
    }

    const iosPath = path.join(projectPath, 'ios');
    const project = await this.xcodeHelper.findProject(iosPath).catch(() => null);
    if (!project) {
      return false;
    }

    try {
      const flag = project.workspace ? '-workspace' : '-project';
      const projectFile = project.workspace || path.basename(project.path);
      const result = await execa(
        'xcodebuild',
        [flag, projectFile, '-showBuildSettings', '-configuration', 'Debug'],
        { cwd: iosPath }
      );

      const iphoneosDeploymentTarget = result.stdout.match(
        /IPHONEOS_DEPLOYMENT_TARGET = (.+)/
      );
      if (!iphoneosDeploymentTarget) {
        return false;
      }

      const actualTarget = iphoneosDeploymentTarget[1].trim();
      return this.compareVersions(actualTarget, expectedTarget) >= 0;
    } catch {
      return false;
    }
  }

  async testBundleIdentifierSuffix(
    type: ExtensionType,
    projectPath: string
  ): Promise<boolean> {
    const expectedSuffix = TYPE_BUNDLE_IDENTIFIER_SUFFIXES[type];
    if (!expectedSuffix) {
      return false;
    }

    const iosPath = path.join(projectPath, 'ios');
    const targetDirs = await glob('*Target', { cwd: iosPath });

    for (const targetDir of targetDirs) {
      const infoPlistPath = path.join(iosPath, targetDir, 'Info.plist');
      try {
        const infoPlist = await fs.readFile(infoPlistPath, 'utf-8');
        const bundleIdMatch = infoPlist.match(
          /<key>CFBundleIdentifier<\/key>\s*<string>(.+)<\/string>/
        );
        if (bundleIdMatch) {
          const bundleId = bundleIdMatch[1];
          if (bundleId.endsWith(`.${expectedSuffix}`)) {
            return true;
          }
        }
      } catch {
        continue;
      }
    }

    return false;
  }

  async testProductType(
    type: ExtensionType,
    projectPath: string
  ): Promise<boolean> {
    const iosPath = path.join(projectPath, 'ios');
    const project = await this.xcodeHelper.findProject(iosPath).catch(() => null);
    if (!project) {
      return false;
    }

    try {
      const flag = project.workspace ? '-workspace' : '-project';
      const projectFile = project.workspace || path.basename(project.path);
      const result = await execa(
        'xcodebuild',
        [flag, projectFile, '-showBuildSettings', '-configuration', 'Debug'],
        { cwd: iosPath }
      );

      const productTypeMatch = result.stdout.match(/PRODUCT_TYPE = (.+)/);
      if (!productTypeMatch) {
        return false;
      }

      const productType = productTypeMatch[1].trim();
      return productType === 'com.apple.product-type.app-extension';
    } catch {
      return false;
    }
  }

  getMinimumDeploymentTarget(type: ExtensionType): string {
    return TYPE_MINIMUM_DEPLOYMENT_TARGETS[type] || '14.0';
  }

  getBundleIdentifierSuffix(type: ExtensionType): string {
    return TYPE_BUNDLE_IDENTIFIER_SUFFIXES[type] || '';
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }
}

