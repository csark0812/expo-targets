/**
 * Structural assertion helpers for working with parsed `xcode` project objects
 * in tests. Kept dependency-free so they can be reused across all PBX-related
 * characterization tests.
 */

/**
 * Find a PBXNativeTarget UUID + object by its product name (the `name` field
 * on the native target, e.g. "App", "ShareMinimal").
 */
export function findNativeTargetByProductName(
  project: any,
  productName: string
): { uuid: string; target: any } | undefined {
  const nativeTargets = project.hash.project.objects.PBXNativeTarget || {};

  for (const uuid of Object.keys(nativeTargets)) {
    if (uuid.endsWith('_comment')) {
      continue;
    }
    const target = nativeTargets[uuid];
    const name =
      typeof target?.name === 'string'
        ? target.name.replace(/"/g, '')
        : target?.name;
    if (name === productName) {
      return { uuid, target };
    }
  }
}

/**
 * Get the (unquoted) productType string for a native target object.
 */
export function getProductType(target: any): string | undefined {
  if (typeof target?.productType !== 'string') {
    return target?.productType;
  }
  return target.productType.replace(/^"|"$/g, '');
}

/**
 * Assert that every build configuration for a target has the expected value
 * for a given build setting key. Throws with a descriptive message on
 * mismatch, so it can be used directly inside `expect(() => ...)` or plain
 * assertions.
 */
export function assertHasBuildSetting(
  project: any,
  targetUuid: string,
  { settingKey, expectedValue }: { settingKey: string; expectedValue: unknown }
): void {
  const nativeTargets = project.hash.project.objects.PBXNativeTarget || {};
  const target = nativeTargets[targetUuid];
  if (!target) {
    throw new Error(`No PBXNativeTarget found for uuid ${targetUuid}`);
  }

  const configLists = project.hash.project.objects.XCConfigurationList || {};
  const configList = configLists[target.buildConfigurationList];
  if (!configList?.buildConfigurations) {
    throw new Error(`No build configurations found for target ${targetUuid}`);
  }

  const buildConfigSection =
    project.hash.project.objects.XCBuildConfiguration || {};

  for (const entry of configList.buildConfigurations) {
    const config = buildConfigSection[entry.value];
    const actual = config?.buildSettings?.[settingKey];
    if (actual !== expectedValue) {
      throw new Error(
        `Expected build setting "${settingKey}" to be ${JSON.stringify(
          expectedValue
        )} on config "${config?.name}", got ${JSON.stringify(actual)}`
      );
    }
  }
}
