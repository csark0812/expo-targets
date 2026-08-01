import { describe, expect, test } from 'bun:test';
import * as path from 'node:path';
import {
  assertHasBuildSetting,
  findNativeTargetByProductName,
  getProductType,
} from '../../../../test-utils/assertPbx';
import { loadPbx } from '../../../../test-utils/loadPbx';
import {
  applyBuildSettings,
  findTargetByProductName,
  removeDuplicateTargets,
  setProductType,
} from './index';

const fixturePath = path.join(
  __dirname,
  '../../../../__fixtures__/pbx/minimal-app/project.pbxproj'
);

describe('findTargetByProductName / findNativeTargetByProductName', () => {
  test('finds the App target by product name', () => {
    const project = loadPbx(fixturePath);

    const uuid = findTargetByProductName({ project, productName: 'App' });
    expect(uuid).toBeDefined();

    const found = findNativeTargetByProductName(project, 'App');
    expect(found?.uuid).toBe(uuid);
    expect(getProductType(found?.target)).toBe(
      'com.apple.product-type.application'
    );
  });

  test('returns undefined for a target that does not exist', () => {
    const project = loadPbx(fixturePath);
    expect(
      findTargetByProductName({ project, productName: 'DoesNotExist' })
    ).toBeUndefined();
  });
});

describe('setProductType', () => {
  test('mutates productType on the target object', () => {
    const project = loadPbx(fixturePath);
    const uuid = findTargetByProductName({ project, productName: 'App' })!;
    const nativeTargets = (project as any).hash.project.objects.PBXNativeTarget;
    const target = { uuid, target: nativeTargets[uuid] };

    setProductType({
      target,
      productType:
        'com.apple.product-type.application.on-demand-install-capable',
    });

    expect(getProductType(nativeTargets[uuid])).toBe(
      'com.apple.product-type.application.on-demand-install-capable'
    );
  });
});

describe('applyBuildSettings', () => {
  test('applies settings to every build configuration of the target', () => {
    const project = loadPbx(fixturePath);
    const uuid = findTargetByProductName({ project, productName: 'App' })!;
    const nativeTargets = (project as any).hash.project.objects.PBXNativeTarget;
    const target = { uuid, target: nativeTargets[uuid] };

    applyBuildSettings({
      project,
      target,
      buildSettings: { SWIFT_VERSION: '5.9' },
    });

    assertHasBuildSetting(project, uuid, {
      settingKey: 'SWIFT_VERSION',
      expectedValue: '5.9',
    });
  });
});

describe('removeDuplicateTargets', () => {
  test('is a no-op when there is only a single target with the product name', () => {
    const project = loadPbx(fixturePath);
    const removedCount = removeDuplicateTargets({
      project,
      productName: 'App',
    });

    expect(removedCount).toBe(0);
    expect(
      findTargetByProductName({ project, productName: 'App' })
    ).toBeDefined();
  });
});
