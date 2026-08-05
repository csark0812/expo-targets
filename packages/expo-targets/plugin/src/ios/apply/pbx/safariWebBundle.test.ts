import { describe, expect, test } from 'bun:test';
import * as path from 'node:path';

import { loadPbx } from '../../../../test-utils/loadPbx';
import {
  buildSafariWebBundleShellScript,
  ensureSafariWebBundlePhase,
} from './safariWebBundle';
import { findTargetByProductName } from './targetLifecycle';

const fixturePath = path.join(
  __dirname,
  '../../../../__fixtures__/pbx/minimal-app/project.pbxproj'
);

describe('buildSafariWebBundleShellScript', () => {
  test('invokes export-safari-bundle with entry and popup paths', () => {
    const script = buildSafariWebBundleShellScript({
      entryFile: 'targets/safari/index.tsx',
      popupJsPath: '/tmp/popup.js',
      popupJsReferencePath: path.join(
        'App',
        'ExpoTargetsGenerated',
        'MySafariTarget',
        'Resources',
        'popup.js'
      ),
    });

    expect(script).toContain('SKIP_SAFARI_EXPORT=1');
    expect(script).toContain('export-safari-bundle.js');
    expect(script).toContain('targets/safari/index.tsx');
    expect(script).toContain('Resources/popup.js');
  });
});

describe('ensureSafariWebBundlePhase', () => {
  test('adds an idempotent Export Safari Web Bundle shell phase', () => {
    const project = loadPbx(fixturePath);
    const targetUuid = findTargetByProductName({
      project,
      productName: 'App',
    })!;
    const plan = {
      entryFile: 'targets/safari/index.tsx',
      popupJsPath: '/tmp/popup.js',
      popupJsReferencePath: 'App/ExpoTargetsGenerated/MySafariTarget/Resources/popup.js',
    };

    ensureSafariWebBundlePhase({ project, targetUuid, plan });
    ensureSafariWebBundlePhase({ project, targetUuid, plan });

    const target = (project as any).hash.project.objects.PBXNativeTarget[
      targetUuid
    ];
    const section = (project as any).hash.project.objects
      .PBXShellScriptBuildPhase;
    const phases = target.buildPhases
      .map((ref: { value: string }) => section[ref.value])
      .filter(Boolean)
      .filter(
        (phase: { name?: string }) =>
          phase.name === 'Export Safari Web Bundle' ||
          phase.name === '"Export Safari Web Bundle"'
      );

    expect(phases).toHaveLength(1);
    expect(phases[0].alwaysOutOfDate).toBe(1);
    expect(phases[0].shellScript).toContain('targets/safari/index.tsx');
  });
});
