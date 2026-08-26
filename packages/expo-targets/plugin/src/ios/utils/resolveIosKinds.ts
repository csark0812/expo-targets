import type {
  IosLiveActivityKindConfig,
  IosWidgetKindConfig,
  LiveActivityConfig,
  WidgetConfiguration,
  WidgetFamily,
} from '../../config';

type KindRow = IosWidgetKindConfig | IosLiveActivityKindConfig;

export function isLiveActivityKind(
  kind: KindRow
): kind is IosLiveActivityKindConfig {
  return kind.type === 'live-activity';
}

export function isWidgetKind(kind: KindRow): kind is IosWidgetKindConfig {
  return kind.type !== 'live-activity';
}

export type IosKindSource = {
  kinds?: KindRow[];
  liveActivity?: LiveActivityConfig;
  liveActivities?: LiveActivityConfig[];
  displayName?: string;
  supportedFamilies?: WidgetFamily[];
  contentMarginsDisabled?: boolean;
  configuration?: WidgetConfiguration;
};

export type ResolveIosKindsInput = {
  targetName: string;
  displayName?: string;
  ios?: IosKindSource;
};

export type ResolvedIosWidgetKind = {
  name: string;
  displayName: string;
  description?: string;
  supportedFamilies?: WidgetFamily[];
  contentMarginsDisabled?: boolean;
  configuration?: WidgetConfiguration;
};

function explicitKinds(ios?: IosKindSource): KindRow[] | undefined {
  const listed = ios?.kinds;
  if (!listed || listed.length === 0) {
    return;
  }
  return listed;
}

function assertNoLiveActivityKinds(ios?: IosKindSource): void {
  if ((explicitKinds(ios) ?? []).some(isLiveActivityKind)) {
    throw new Error(
      'ios.kinds cannot contain { "type": "live-activity" }. Set ios.liveActivity or ios.liveActivities instead.'
    );
  }
}

function assertUniqueLiveActivityNames(configs: LiveActivityConfig[]): void {
  const seen = new Set<string>();
  for (const config of configs) {
    const name = config.attributesName;
    if (seen.has(name)) {
      throw new Error(
        `Duplicate Live Activity attributesName "${name}" in ios.liveActivities.`
      );
    }
    seen.add(name);
  }
}

/** All Live Activities declared on a widget target (0..N). */
export function resolveLiveActivityConfigs(input: {
  ios?: IosKindSource;
}): LiveActivityConfig[] {
  assertNoLiveActivityKinds(input.ios);
  const ios = input.ios;
  const fromArray = (ios?.liveActivities ?? []).filter(
    (row) => row.attributesName
  );
  const singular = ios?.liveActivity?.attributesName
    ? [ios.liveActivity]
    : [];

  if (fromArray.length > 0 && singular.length > 0) {
    throw new Error(
      'Use ios.liveActivities OR ios.liveActivity on a widget target, not both.'
    );
  }

  const configs = fromArray.length > 0 ? fromArray : singular;
  assertUniqueLiveActivityNames(configs);
  return configs;
}

/** First Live Activity on a widget target, when callers only need 0..1. */
export function resolveLiveActivityConfig(input: {
  ios?: IosKindSource;
}): LiveActivityConfig | undefined {
  return resolveLiveActivityConfigs(input)[0];
}

function widgetRowsForTarget(
  input: ResolveIosKindsInput,
  listed: KindRow[] | undefined
): IosWidgetKindConfig[] {
  if (listed) {
    return listed.filter(isWidgetKind);
  }
  return [
    {
      name: input.targetName,
      displayName: input.displayName ?? input.ios?.displayName,
    },
  ];
}

function resolveOneGalleryKind(opts: {
  row: IosWidgetKindConfig;
  ios: IosKindSource;
  input: ResolveIosKindsInput;
  listed: KindRow[] | undefined;
}): ResolvedIosWidgetKind {
  const { row, ios, input, listed } = opts;
  return {
    name: row.name,
    displayName:
      row.displayName || ios.displayName || input.displayName || row.name,
    description: row.description,
    supportedFamilies: row.supportedFamilies ?? ios.supportedFamilies,
    contentMarginsDisabled:
      row.contentMarginsDisabled ?? ios.contentMarginsDisabled,
    configuration: listed
      ? row.configuration
      : (row.configuration ?? ios.configuration),
  };
}

export function resolveGalleryWidgetKinds(
  input: ResolveIosKindsInput
): ResolvedIosWidgetKind[] {
  const ios = input.ios || {};
  assertNoLiveActivityKinds(ios);
  const listed = explicitKinds(ios);
  const widgetRows = widgetRowsForTarget(input, listed);
  const seen = new Set<string>();
  const resolved: ResolvedIosWidgetKind[] = [];
  for (const row of widgetRows) {
    if (seen.has(row.name)) {
      throw new Error(`Duplicate ios.kinds widget name "${row.name}"`);
    }
    seen.add(row.name);
    resolved.push(resolveOneGalleryKind({ row, ios, input, listed }));
  }
  return resolved;
}

export function hasExplicitGalleryKinds(ios?: IosKindSource): boolean {
  return Boolean(explicitKinds(ios)?.some(isWidgetKind));
}
