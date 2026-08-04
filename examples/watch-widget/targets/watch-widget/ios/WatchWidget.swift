import SwiftUI
import WidgetKit

struct WatchWidgetEntry: TimelineEntry {
  let date: Date
}

struct WatchWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> WatchWidgetEntry {
    WatchWidgetEntry(date: Date())
  }

  func getSnapshot(in context: Context, completion: @escaping (WatchWidgetEntry) -> Void) {
    completion(WatchWidgetEntry(date: Date()))
  }

  func getTimeline(
    in context: Context,
    completion: @escaping (Timeline<WatchWidgetEntry>) -> Void
  ) {
    completion(Timeline(entries: [WatchWidgetEntry(date: Date())], policy: .never))
  }
}

struct WatchWidgetView: View {
  var entry: WatchWidgetEntry

  var body: some View {
    Text("ET Watch Widget")
  }
}

struct WatchWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "WatchWidget", provider: WatchWidgetProvider()) { entry in
      WatchWidgetView(entry: entry)
    }
    .configurationDisplayName("ET Watch Widget")
    .description("watch-widget example")
    .supportedFamilies([
      .accessoryCircular,
      .accessoryRectangular,
      .accessoryInline,
      .accessoryCorner,
    ])
  }
}

@main
struct WatchWidgetBundle: WidgetBundle {
  var body: some Widget {
    WatchWidget()
  }
}
