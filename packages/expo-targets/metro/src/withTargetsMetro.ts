import type { MetroConfig } from 'metro-config';

export function withTargetsMetro(
  metroConfig: MetroConfig,
  options?: {
    targets?: string[];
  }
): MetroConfig {
  const originalGetTransformOptions =
    metroConfig.transformer?.getTransformOptions;

  return {
    ...metroConfig,
    transformer: {
      ...metroConfig.transformer,
      getTransformOptions: async (
        entryPoints: readonly string[],
        options: any,
        getDependenciesOf: any
      ) => {
        const transformOptions = originalGetTransformOptions
          ? await originalGetTransformOptions(
              entryPoints,
              options,
              getDependenciesOf
            )
          : {};

        return {
          ...transformOptions,
          transform: {
            ...transformOptions.transform,
            experimentalImportSupport: false,
            inlineRequires: true,
          },
        };
      },
    },
    serializer: {
      ...metroConfig.serializer,
      getModulesRunBeforeMainModule: () => [],
    },
  };
}
