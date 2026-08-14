import type {
  AndroidTargetConfig,
  AndroidWidgetProviderConfig,
} from '../config';

export function sanitizeWidgetResourceName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

export function toWidgetNamePascal(name: string): string {
  return (
    name.charAt(0).toUpperCase() +
    name.slice(1).replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
  );
}

export interface ResolveAndroidWidgetProvidersInput {
  packageName: string;
  targetName: string;
  displayName?: string;
  android?: AndroidTargetConfig;
}

export interface ResolvedAndroidWidgetProvider {
  name: string;
  resourceName: string;
  displayName: string;
  className: string;
  xmlName: string;
  descriptionStringName: string | null;
  initialLayout: string;
  minWidth: string;
  minHeight: string;
  resizeMode: string;
  updatePeriodMillis: number;
  widgetCategory: string;
  previewImage?: string;
  description?: string;
  maxResizeWidth?: string;
  maxResizeHeight?: string;
  targetCellWidth?: number;
  targetCellHeight?: number;
  hasExplicitLayout: boolean;
}

export interface WidgetProviderXmlFields {
  minWidth: string;
  minHeight: string;
  resizeMode: string;
  updatePeriodMillis: number;
  widgetCategory: string;
  initialLayout: string;
  previewImage?: string;
  descriptionStringName?: string | null;
  maxResizeWidth?: string;
  maxResizeHeight?: string;
  targetCellWidth?: number;
  targetCellHeight?: number;
}

function layoutSizes(
  provider: AndroidWidgetProviderConfig,
  android: AndroidTargetConfig
) {
  return {
    minWidth: provider.minWidth ?? android.minWidth ?? '180dp',
    minHeight: provider.minHeight ?? android.minHeight ?? '110dp',
    resizeMode:
      provider.resizeMode ?? android.resizeMode ?? 'horizontal|vertical',
    updatePeriodMillis:
      provider.updatePeriodMillis ?? android.updatePeriodMillis ?? 0,
    widgetCategory:
      provider.widgetCategory ?? android.widgetCategory ?? 'home_screen',
  };
}

function layoutOptional(
  provider: AndroidWidgetProviderConfig,
  android: AndroidTargetConfig
) {
  return {
    description: provider.description ?? android.description,
    previewImage: provider.previewImage ?? android.previewImage,
    maxResizeWidth: provider.maxResizeWidth ?? android.maxResizeWidth,
    maxResizeHeight: provider.maxResizeHeight ?? android.maxResizeHeight,
    targetCellWidth: provider.targetCellWidth ?? android.targetCellWidth,
    targetCellHeight: provider.targetCellHeight ?? android.targetCellHeight,
  };
}

function layoutFields(
  provider: AndroidWidgetProviderConfig,
  android: AndroidTargetConfig,
  resourceName: string
) {
  const explicitLayout = provider.initialLayout ?? android.initialLayout;
  return {
    ...layoutSizes(provider, android),
    ...layoutOptional(provider, android),
    initialLayout: explicitLayout || `widget_${resourceName}`,
    hasExplicitLayout: Boolean(explicitLayout),
  };
}

function resolveClassName(opts: {
  packageName: string;
  targetSegment: string;
  providerName: string;
  widgetType: 'glance' | 'remoteviews';
  className?: string;
}): string {
  const packagePrefix = `${opts.packageName}.widget.${opts.targetSegment}`;
  if (opts.className) {
    if (opts.className.includes('.')) {
      return opts.className;
    }
    return `${packagePrefix}.${opts.className}`;
  }
  const pascal = toWidgetNamePascal(opts.providerName);
  const suffix = opts.widgetType === 'glance' ? 'WidgetReceiver' : 'Provider';
  return `${packagePrefix}.${pascal}${suffix}`;
}

function toResolvedProvider(
  input: ResolveAndroidWidgetProvidersInput,
  provider: AndroidWidgetProviderConfig
): ResolvedAndroidWidgetProvider {
  const android = input.android || {};
  const resourceName = sanitizeWidgetResourceName(provider.name);
  const layout = layoutFields(provider, android, resourceName);
  return {
    name: provider.name,
    resourceName,
    displayName:
      provider.displayName ||
      input.displayName ||
      provider.name ||
      input.targetName,
    className: resolveClassName({
      packageName: input.packageName,
      targetSegment: sanitizeWidgetResourceName(input.targetName),
      providerName: provider.name,
      widgetType: android.widgetType || 'glance',
      className: provider.className,
    }),
    xmlName: `widgetprovider_${resourceName}`,
    descriptionStringName: layout.description
      ? `widget_${resourceName}_description`
      : null,
    ...layout,
  };
}

export function resolveAndroidWidgetProviders(
  input: ResolveAndroidWidgetProvidersInput
): ResolvedAndroidWidgetProvider[] {
  const android = input.android || {};
  const listed = android.providers;
  const configs: AndroidWidgetProviderConfig[] =
    listed && listed.length > 0
      ? listed
      : [{ name: input.targetName, displayName: input.displayName }];

  const seenNames = new Set<string>();
  const seenClassNames = new Set<string>();
  const resolved: ResolvedAndroidWidgetProvider[] = [];

  for (const config of configs) {
    const next = toResolvedProvider(input, config);
    if (seenNames.has(next.resourceName)) {
      throw new Error(
        `Duplicate android.providers name "${config.name}" (resource "${next.resourceName}") on target "${input.targetName}"`
      );
    }
    if (seenClassNames.has(next.className)) {
      throw new Error(
        `Duplicate AppWidgetProvider className "${next.className}" on target "${input.targetName}"`
      );
    }
    seenNames.add(next.resourceName);
    seenClassNames.add(next.className);
    resolved.push(next);
  }

  return resolved;
}

export function buildAppWidgetProviderXml(
  fields: WidgetProviderXmlFields
): Record<string, string> {
  const attrs: Record<string, string> = {
    'xmlns:android': 'http://schemas.android.com/apk/res/android',
    'android:minWidth': fields.minWidth,
    'android:minHeight': fields.minHeight,
    'android:resizeMode': fields.resizeMode,
    'android:updatePeriodMillis': String(fields.updatePeriodMillis),
    'android:widgetCategory': fields.widgetCategory,
    'android:initialLayout': `@layout/${fields.initialLayout}`,
  };

  if (fields.previewImage) {
    const preview =
      fields.previewImage.startsWith('@') || fields.previewImage.includes('/')
        ? fields.previewImage
        : `@drawable/${fields.previewImage}`;
    attrs['android:previewImage'] = preview;
  }
  if (fields.descriptionStringName) {
    attrs['android:description'] = `@string/${fields.descriptionStringName}`;
  }
  if (fields.maxResizeWidth) {
    attrs['android:maxResizeWidth'] = fields.maxResizeWidth;
  }
  if (fields.maxResizeHeight) {
    attrs['android:maxResizeHeight'] = fields.maxResizeHeight;
  }
  if (fields.targetCellWidth) {
    attrs['android:targetCellWidth'] = String(fields.targetCellWidth);
  }
  if (fields.targetCellHeight) {
    attrs['android:targetCellHeight'] = String(fields.targetCellHeight);
  }

  return attrs;
}

const ATTR_RE = /([A-Za-z_:][A-Za-z0-9_:]*)="([^"]*)"/g;

function parseAppWidgetProviderAttributes(xml: string): Record<string, string> {
  const match = xml.match(/<appwidget-provider\b([^>]*)\/?>/s);
  if (!match) {
    return {};
  }
  const attrs: Record<string, string> = {};
  const body = match[1] ?? '';
  for (const part of body.matchAll(ATTR_RE)) {
    const name = part[1];
    const value = part[2];
    if (name && value !== undefined) {
      attrs[name] = value;
    }
  }
  return attrs;
}

function formatAppWidgetProviderXml(attrs: Record<string, string>): string {
  const lines = Object.entries(attrs).map(
    ([name, value]) => `    ${name}="${value}"`
  );
  return `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider
${lines.join('\n')}>
</appwidget-provider>
`;
}

export function mergeAppWidgetProviderXml(
  existing: string | null,
  generated: Record<string, string>
): string {
  const current = existing ? parseAppWidgetProviderAttributes(existing) : {};
  return formatAppWidgetProviderXml({ ...current, ...generated });
}

export function xmlFieldsFromProvider(
  provider: ResolvedAndroidWidgetProvider
): WidgetProviderXmlFields {
  return {
    minWidth: provider.minWidth,
    minHeight: provider.minHeight,
    resizeMode: provider.resizeMode,
    updatePeriodMillis: provider.updatePeriodMillis,
    widgetCategory: provider.widgetCategory,
    initialLayout: provider.initialLayout,
    previewImage: provider.previewImage,
    descriptionStringName: provider.descriptionStringName,
    maxResizeWidth: provider.maxResizeWidth,
    maxResizeHeight: provider.maxResizeHeight,
    targetCellWidth: provider.targetCellWidth,
    targetCellHeight: provider.targetCellHeight,
  };
}
