import WidgetKit
import SwiftUI
internal import ExpoWidgets

/// Expo-UI layout sandbox widget (expo-widgets WidgetsEntryView + TimelineProvider).
/// Layout JS is registered from the host via createTarget(name, Layout) + `'widget'` directive.
struct {{NAME}}: Widget {
  let name: String = "{{NAME}}"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName({{DISPLAY_NAME}})
    .description({{DESCRIPTION}})
    .supportedFamilies([{{SUPPORTED_FAMILIES}}]){{CONTENT_MARGINS}}
  }
}
