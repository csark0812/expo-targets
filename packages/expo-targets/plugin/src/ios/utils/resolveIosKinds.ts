import type {
  IosKindConfig,
  IosLiveActivityKindConfig,
  IosWidgetKindConfig,
  LiveActivityConfig,
  WidgetConfiguration,
  WidgetFamily,
} from '../../config';

export function isLiveActivityKind(
  kind: IosKindConfig
): kind is IosLiveActivityKindConfig {
  return kind.type === 'live-activity';
}

export function isWidgetKind(kind: IosKindConfig): kind is IosWidgetKindConfig {
  return kind.type !== 'live-activity';
}

type IosKindSource = {
  kinds?: IosKindConfig[];
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

function explicitKinds(ios?: IosKindSource): IosKindConfig[] | undefined {
  const listed = ios?.kinds;
  if (!listed || listed.length === 0) {
    return;
  }
  return listed;
}

export function resolveLiveActivityConfig(input: {
  ios?: IosKindSource;
}): LiveActivityConfig | undefined {
  const listed = explicitKinds(input.ios);
  if (!listed) {
    return;
  }
  const live = listed.filter(isLiveActivityKind);
  if (live.length > 1) {
    throw new Error(
      'ios.kinds may contain at most one { "type": "live-activity" } row'
    );
  }
  const row = live[0];
  if (!row) {
    return;
  }
  return {
    attributesName: row.attributesName,
    static: row.static,
    contentState: row.contentState,
    pushType: row.pushType,
  };
}

function widgetRowsForTarget(
  input: ResolveIosKindsInput,
  listed: IosKindConfig[] | undefined
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
  listed: IosKindConfig[] | undefined;
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
