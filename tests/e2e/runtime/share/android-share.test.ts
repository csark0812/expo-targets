import * as path from 'path';
import * as fs from 'fs';
import { TestRunner } from '../../framework/TestRunner.js';
import { BuildTestRunner } from '../../framework/BuildTestRunner.js';
import type { TestSuite } from '../../framework/types.js';

const SHARE_APP = path.resolve(__dirname, '../../../apps/bare-rn-share');
const PACKAGE_NAME = 'com.test.barernshare';

async function runAndroidShareExtensionTests() {
  const runner = new TestRunner();
  const buildRunner = new BuildTestRunner();

  const tests: TestSuite = {
    name: 'Android Share Extension Tests',
    tests: []
  };

  tests.tests.push(
    await runner.runTest('Android share activity registered in manifest', async () => {
      const manifestPath = path.join(
        SHARE_APP,
        'android/app/src/main/AndroidManifest.xml'
      );
      
      if (!fs.existsSync(manifestPath)) {
        throw new Error('AndroidManifest.xml not found. Run prebuild first.');
      }

      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      
      // Check for share activity
      if (!manifestContent.includes('ShareExtensionShareActivity')) {
        throw new Error('Share activity not registered in AndroidManifest.xml');
      }

      // Check for ACTION_SEND intent filter
      if (!manifestContent.includes('android.intent.action.SEND')) {
        throw new Error('ACTION_SEND intent filter not found');
      }

      // Check for exported flag
      if (!manifestContent.includes('android:exported="true"')) {
        throw new Error('Share activity is not exported');
      }
    })
  );

  tests.tests.push(
    await runner.runTest('Android share theme generated', async () => {
      const themePath = path.join(
        SHARE_APP,
        'android/app/src/main/res/values/styles_share_shareextension.xml'
      );
      
      if (!fs.existsSync(themePath)) {
        throw new Error('Share extension theme not generated');
      }

      const themeContent = fs.readFileSync(themePath, 'utf-8');
      
      if (!themeContent.includes('Theme.ShareExtensionShare')) {
        throw new Error('Share theme not properly configured');
      }
    })
  );

  tests.tests.push(
    await runner.runTest('Share extension Activity template generated', async () => {
      const packagePath = PACKAGE_NAME.replace(/\./g, '/');
      const activityPath = path.join(
        SHARE_APP,
        'targets/share-extension/android',
        packagePath,
        'share/ShareExtensionShareActivity.kt'
      );
      
      if (!fs.existsSync(activityPath)) {
        throw new Error('Share activity template not generated');
      }

      const activityContent = fs.readFileSync(activityPath, 'utf-8');
      
      // Check for required imports
      if (!activityContent.includes('ReactActivity')) {
        throw new Error('Activity does not extend ReactActivity');
      }

      // Check component name matches
      if (!activityContent.includes('ShareExtension')) {
        throw new Error('Component name mismatch in Activity');
      }
    })
  );

  tests.tests.push(
    await runner.runTest('Share extension source sets configured in build.gradle', async () => {
      const buildGradlePath = path.join(
        SHARE_APP,
        'android/app/build.gradle'
      );
      
      if (!fs.existsSync(buildGradlePath)) {
        throw new Error('build.gradle not found');
      }

      const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf-8');
      
      // Check for sourceSets configuration
      const hasSourceSets = buildGradleContent.includes('sourceSets') &&
                            buildGradleContent.includes('targets/share-extension/android');
      
      if (!hasSourceSets) {
        throw new Error('Share extension source sets not configured');
      }
    })
  );

  tests.tests.push(
    await runner.runTest('ExpoTargetsExtensionModule has Android implementation', async () => {
      const modulePath = path.join(
        __dirname,
        '../../../../packages/expo-targets/android/src/main/java/expo/modules/targets/extension/ExpoTargetsExtensionModule.kt'
      );
      
      if (!fs.existsSync(modulePath)) {
        throw new Error('ExpoTargetsExtensionModule.kt not found');
      }

      const moduleContent = fs.readFileSync(modulePath, 'utf-8');
      
      // Check for required functions
      const requiredFunctions = [
        'closeExtension',
        'openHostApp',
        'getSharedData'
      ];

      for (const func of requiredFunctions) {
        if (!moduleContent.includes(func)) {
          throw new Error(`Function ${func} not implemented`);
        }
      }

      // Check for Intent handling
      if (!moduleContent.includes('Intent.ACTION_SEND')) {
        throw new Error('ACTION_SEND intent handling not implemented');
      }

      if (!moduleContent.includes('Intent.ACTION_SEND_MULTIPLE')) {
        throw new Error('ACTION_SEND_MULTIPLE intent handling not implemented');
      }
    })
  );

  tests.tests.push(
    await runner.runTest('Share extension supports multiple MIME types', async () => {
      const manifestPath = path.join(
        SHARE_APP,
        'android/app/src/main/AndroidManifest.xml'
      );
      
      if (!fs.existsSync(manifestPath)) {
        throw new Error('AndroidManifest.xml not found');
      }

      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      
      // Check for multiple MIME type support
      const requiredMimeTypes = ['text/plain', 'image/*'];
      
      for (const mimeType of requiredMimeTypes) {
        if (!manifestContent.includes(mimeType)) {
          throw new Error(`MIME type ${mimeType} not configured`);
        }
      }
    })
  );

  runner.addSuite(tests);
  const success = await runner.runAll();
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAndroidShareExtensionTests();
}

export { runAndroidShareExtensionTests };
