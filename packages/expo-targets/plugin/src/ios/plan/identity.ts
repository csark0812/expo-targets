import {
  getFrameworksForType,
  productTypeForType,
  TYPE_BUNDLE_IDENTIFIER_SUFFIXES,
  TYPE_CHARACTERISTICS,
} from '../../domain';
import * as Paths from '../utils/paths';
import type { IOSTargetProps, TargetIdentity } from './types';

const DEFAULT_DEPLOYMENT_TARGET = '18.0';

/**
 * Resolve the names, identifiers and product metadata for a target.
 */
export function resolveIdentity({
  props,
  mainBundleIdentifier,
}: {
  props: IOSTargetProps;
  mainBundleIdentifier: string | undefined;
}): TargetIdentity {
  if (!mainBundleIdentifier) {
    throw new Error('iOS bundle identifier not found in app.json');
  }

  const typeConfig = TYPE_CHARACTERISTICS[props.type];
  const targetName = props.name;

  // Use type-specific suffix, falling back to sanitized target name if not in map
  const bundleIdentifierSuffix =
    TYPE_BUNDLE_IDENTIFIER_SUFFIXES[props.type] ||
    Paths.sanitizeTargetName(props.name);

  return {
    type: props.type,
    name: props.name,
    displayName: props.displayName,
    targetName,
    targetProductName: Paths.sanitizeTargetName(targetName),
    mainBundleIdentifier,
    bundleIdentifier:
      props.bundleIdentifier ||
      `${mainBundleIdentifier}.${bundleIdentifierSuffix}`,
    deploymentTarget: props.deploymentTarget || DEFAULT_DEPLOYMENT_TARGET,
    productType: productTypeForType(props.type),
    targetType: typeConfig.targetType,
    frameworks: [
      ...(getFrameworksForType(props.type) || []),
      ...(props.frameworks || []),
    ],
  };
}
