import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { UITEST_TARGET_NAME } from './constants';
import { findHostSchemePath, updateHostScheme } from './scheme';

function writeFixtureScheme(dir: string, host: string): string {
  const xcodeproj = path.join(dir, `${host}.xcodeproj`);
  const schemes = path.join(xcodeproj, 'xcshareddata', 'xcschemes');
  fs.mkdirSync(schemes, { recursive: true });
  const schemePath = path.join(schemes, `${host}.xcscheme`);
  fs.writeFileSync(
    schemePath,
    `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion = "1130" version = "1.3">
   <TestAction
      buildConfiguration = "Debug"
      shouldUseLaunchSchemeArgsEnv = "YES">
      <Testables>
         <TestableReference skipped = "NO">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "DEADBEEF"
               BuildableName = "GoneTests.xctest"
               BlueprintName = "GoneTests"
               ReferencedContainer = "container:${host}.xcodeproj">
            </BuildableReference>
         </TestableReference>
      </Testables>
   </TestAction>
   <LaunchAction buildConfiguration = "Debug">
   </LaunchAction>
</Scheme>
`
  );
  return xcodeproj;
}

describe('updateHostScheme', () => {
  test('adds UITest testable, drops stale, sets Release + env', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ios-harness-scheme-'));
    const xcodeproj = writeFixtureScheme(dir, 'ETShare');
    const schemePath = findHostSchemePath({
      xcodeprojPath: xcodeproj,
      hostName: 'ETShare',
    });
    const result = updateHostScheme({
      schemePath,
      projectFileName: 'ETShare.xcodeproj',
      knownTargetNames: new Set(['ETShare', UITEST_TARGET_NAME]),
      uiTestTargetName: UITEST_TARGET_NAME,
      uiTest: {
        blueprintId: 'ABCDEF',
        blueprintName: UITEST_TARGET_NAME,
        buildableName: `${UITEST_TARGET_NAME}.xctest`,
      },
      env: {
        UITEST_HOST_BUNDLE_ID: 'com.example',
        UITEST_EXTENSION_NAME: 'ET Share',
      },
    });
    const xml = fs.readFileSync(result.path, 'utf8');
    expect(result.addedTestable).toBe(true);
    expect(result.removedStale).toBe(1);
    expect(xml).toContain(`BlueprintName = "${UITEST_TARGET_NAME}"`);
    expect(xml).not.toContain('GoneTests');
    expect(xml).toContain('buildConfiguration = "Release"');
    expect(xml).toContain('shouldUseLaunchSchemeArgsEnv = "NO"');
    expect(xml).toContain('UITEST_HOST_BUNDLE_ID');
    expect(xml).toContain('com.example');
  });
});
