import * as fs from 'node:fs';
import * as path from 'node:path';

import type { WidgetConfiguration } from '../../config';

function loadTemplate(name: string): string {
  return fs.readFileSync(path.join(__dirname, '../templates', name), 'utf8');
}

function paramSwiftType(
  widgetName: string,
  paramName: string,
  type: string
): string {
  switch (type) {
    case 'number':
      return 'Double';
    case 'boolean':
      return 'Bool';
    case 'enum':
      return `${widgetName}${paramName[0]?.toUpperCase()}${paramName.slice(1)}Enum`;
    default:
      return 'String';
  }
}

function paramDefaultExpr(
  widgetName: string,
  paramName: string,
  param: WidgetConfiguration['parameters'][string]
): string {
  if (param.type === 'string') {
    return JSON.stringify(param.default);
  }
  if (param.type === 'number' || param.type === 'boolean') {
    return String(param.default);
  }
  return `${widgetName}${paramName[0]?.toUpperCase()}${paramName.slice(1)}Enum.${param.default}`;
}

function enumBlocks(
  widgetName: string,
  configuration: WidgetConfiguration
): string {
  return Object.entries(configuration.parameters)
    .map(([name, param]) => {
      if (param.type !== 'enum') return '';
      const paramTypeName = `${widgetName}${name[0]?.toUpperCase()}${name.slice(1)}Enum`;
      return `
enum ${paramTypeName}: String, CaseIterable, AppEnum {
  ${param.values.map((value) => `case ${value.value}`).join('\n  ')}

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: ${JSON.stringify(param.title)})

  static var caseDisplayRepresentations: [${paramTypeName}: DisplayRepresentation] = [
    ${param.values
      .map(
        (value) =>
          `.${value.value}: DisplayRepresentation(title: ${JSON.stringify(value.name)})`
      )
      .join(',\n    ')}
  ]
}`;
    })
    .join('\n');
}

function configurationEnvLines(configuration: WidgetConfiguration): string {
  return Object.entries(configuration.parameters)
    .map(([name, param]) => {
      const suffix = param.type === 'enum' ? '.rawValue' : '';
      return `      "${name}": entry.configuration.${name}${suffix}`;
    })
    .join(',\n');
}

function intentParameters(
  widgetName: string,
  configuration: WidgetConfiguration
): string {
  return Object.entries(configuration.parameters)
    .map(([name, param]) => {
      const paramType = paramSwiftType(widgetName, name, param.type);
      const defaultExpr = paramDefaultExpr(widgetName, name, param);
      return `  @Parameter(title: ${JSON.stringify(param.title)}, default: ${defaultExpr})\n  var ${name}: ${paramType}`;
    })
    .join('\n');
}

function familiesLiteral(families?: string[]): string {
  const list =
    families && families.length > 0
      ? families
      : ['systemSmall', 'systemMedium', 'systemLarge'];
  return list.map((f) => `.${f}`).join(', ');
}

/** StaticConfiguration expo-ui widget (no Edit Widget). */
export function generateExpoUiWidgetSwift(options: {
  name: string;
  displayName?: string;
  description?: string;
  supportedFamilies?: string[];
  contentMarginsDisabled?: boolean;
  configuration?: WidgetConfiguration;
}): string {
  if (options.configuration) {
    return generateConfigurableExpoUiWidgetSwift(options);
  }

  const displayName = JSON.stringify(options.displayName ?? options.name);
  const description = JSON.stringify(
    options.description ?? `${options.name} (expo-ui)`
  );
  const families = familiesLiteral(options.supportedFamilies);
  const margins = options.contentMarginsDisabled
    ? '\n    .contentMarginsDisabled()'
    : '';
  return loadTemplate('ExpoUiWidget.swift')
    .split('{{NAME}}')
    .join(options.name)
    .split('{{DISPLAY_NAME}}')
    .join(displayName)
    .split('{{DESCRIPTION}}')
    .join(description)
    .split('{{SUPPORTED_FAMILIES}}')
    .join(families)
    .split('{{CONTENT_MARGINS}}')
    .join(margins);
}

function generateConfigurableExpoUiWidgetSwift(options: {
  name: string;
  displayName?: string;
  description?: string;
  supportedFamilies?: string[];
  contentMarginsDisabled?: boolean;
  configuration?: WidgetConfiguration;
}): string {
  const configuration = options.configuration!;
  const displayName = options.displayName ?? options.name;
  const description =
    options.description ?? `${displayName} (expo-ui configurable)`;
  const families = familiesLiteral(options.supportedFamilies);
  const margins = options.contentMarginsDisabled
    ? '\n    .contentMarginsDisabled()'
    : '';
  const configTitle = JSON.stringify(
    configuration.title ?? `${displayName} Configuration`
  );
  const configDescription = configuration.description
    ? `  static var description: LocalizedStringResource = ${JSON.stringify(configuration.description)}\n`
    : '';

  return `import WidgetKit
import SwiftUI
import AppIntents
internal import ExpoWidgets

// AppIntent
struct ${options.name}ConfigurationAppIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = ${configTitle}
${configDescription}${intentParameters(options.name, configuration)}

  func perform() async throws -> some IntentResult {
    return .result()
  }
}
${enumBlocks(options.name, configuration)}

struct ${options.name}TimelineEntry: TimelineEntry {
  let date: Date
  public let name: String
  public let props: [String: Any]?
  public let entryIndex: Int?
  let configuration: ${options.name}ConfigurationAppIntent
}

struct ${options.name}TimelineProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> ${options.name}TimelineEntry {
    ${options.name}TimelineEntry(date: Date(), name: "${options.name}", props: nil, entryIndex: nil, configuration: ${options.name}ConfigurationAppIntent())
  }

  func snapshot(for configuration: ${options.name}ConfigurationAppIntent, in context: Context) async -> ${options.name}TimelineEntry {
    let entries = parseTimeline(configuration: configuration)
    return entries.first ?? ${options.name}TimelineEntry(date: Date(), name: "${options.name}", props: nil, entryIndex: nil, configuration: configuration)
  }

  func timeline(for configuration: ${options.name}ConfigurationAppIntent, in context: Context) async -> Timeline<${options.name}TimelineEntry> {
    let entries = self.parseTimeline(configuration: configuration)
    let timeline = Timeline<${options.name}TimelineEntry>(entries: entries, policy: .atEnd)
    return timeline
  }

  func parseTimeline(configuration: ${options.name}ConfigurationAppIntent) -> [${options.name}TimelineEntry] {
    let timeline = WidgetsStorage.getArray(forKey: "__expo_widgets_${options.name}_timeline") ?? []
    let entries: [${options.name}TimelineEntry?] = timeline.enumerated().map { index, entry in
      guard let entry = entry as? [String: Any], let timestamp = entry["timestamp"] as? Int, let props = entry["properties"] as? [String: Any] else {
        return nil
      }
      return ${options.name}TimelineEntry(
        date: Date(timeIntervalSince1970: Double(timestamp) / 1000),
        name: "${options.name}",
        props: props,
        entryIndex: index,
        configuration: configuration
      )
    }

    return entries.compactMap(\\.self)
  }
}

struct ${options.name}EntryView: View {
  @Environment(\\.self) var environment
  var entry: ${options.name}TimelineProvider.Entry

  init(entry: ${options.name}TimelineProvider.Entry) {
    self.entry = entry
  }

  private var widgetEnvironment: [String: Any] {
    var env: [String: Any] = getWidgetEnvironment(environment: environment)
    env["timestamp"] = Int(entry.date.timeIntervalSince1970 * 1000)
    env["configuration"] = [
${configurationEnvLines(configuration)}
    ]
    return env
  }

  private var widgetEnvironmentString: String? {
    guard let data = try? JSONSerialization.data(withJSONObject: widgetEnvironment),
          let jsonString = String(data: data, encoding: .utf8) else {
        return nil
    }
    return jsonString
  }

  public var body: some View {
    if let layout = WidgetsStorage.getString(forKey: "__expo_widgets_\\(entry.name)_layout"),
       !layout.isEmpty {
      let node = evaluateLayout(layout: layout, props: entry.props ?? [:], environment: widgetEnvironment)
      WidgetsDynamicView(name: entry.name, kind: .widget, node: node, entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    } else {
      WidgetsDynamicView(name: entry.name, kind: .widget, node: createRedBox(message: "No layout found for \\(WidgetsStorage.appGroupIdentifier ?? "")::\\(entry.name)"), entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    }
  }
}


@available(iOS 17.0, *)
struct ${options.name}: Widget {
  let name: String = "${options.name}"

  var body: some WidgetConfiguration {
    return AppIntentConfiguration(kind: name, intent: ${options.name}ConfigurationAppIntent.self, provider: ${options.name}TimelineProvider()) { entry in
      ${options.name}EntryView(entry: entry)
    }
    .configurationDisplayName(${JSON.stringify(displayName)})
    .description(${JSON.stringify(description)})
    .supportedFamilies([${families}])${margins}
  }
}
`;
}

export function generateExpoUiWidgetBundleSwift(options: {
  name: string;
  /** Gallery Widget structs to instantiate (kind names). */
  widgets?: { name: string; configurable?: boolean }[];
  /** When true, include expo-widgets WidgetLiveActivity() for expo-ui LA slots. */
  includeLiveActivity?: boolean;
  /** Wrap home widget in iOS 17 availability (configurable AppIntent). */
  configurable?: boolean;
}): string {
  const widgets =
    options.widgets && options.widgets.length > 0
      ? options.widgets
      : [{ name: options.name, configurable: Boolean(options.configurable) }];

  const widgetLines = widgets
    .map((widget) => {
      if (widget.configurable) {
        return `    if #available(iOS 17.0, *) {
      ${widget.name}()
    }`;
      }
      return `    ${widget.name}()`;
    })
    .join('\n');

  const liveLine = options.includeLiveActivity
    ? '\n    WidgetLiveActivity()'
    : '';

  return `import WidgetKit
import SwiftUI
internal import ExpoWidgets

@main
struct ${options.name}Bundle: WidgetBundle {
  var body: some Widget {
${widgetLines}${liveLine}
  }
}
`;
}
