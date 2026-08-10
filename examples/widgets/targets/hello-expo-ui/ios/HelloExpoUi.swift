import WidgetKit
import SwiftUI
internal import ExpoWidgets

/// Expo-UI layout sandbox widget (expo-widgets WidgetsEntryView + TimelineProvider).
/// Layout JS is registered from the host via createTarget(name, Layout) + `'widget'` directive.
struct HelloExpoUi: Widget {
  let name: String = "HelloExpoUi"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Hello Expo UI")
    .description("Hello Expo UI (expo-ui)")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
