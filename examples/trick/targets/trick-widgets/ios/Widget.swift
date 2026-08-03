import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Home screen widget

struct TrickEntry: TimelineEntry {
  let date: Date
  let message: String
}

struct TrickProvider: TimelineProvider {
  let appGroup = "group.com.expotargets.example.trick"

  func placeholder(in context: Context) -> TrickEntry {
    TrickEntry(date: Date(), message: "ET Trick")
  }

  func getSnapshot(in context: Context, completion: @escaping (TrickEntry) -> Void) {
    completion(TrickEntry(date: Date(), message: loadMessage()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TrickEntry>) -> Void) {
    let entry = TrickEntry(date: Date(), message: loadMessage())
    let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
    completion(Timeline(entries: [entry], policy: .after(next)))
  }

  private func loadMessage() -> String {
    UserDefaults(suiteName: appGroup)?.string(forKey: "TrickWidget:message")
      ?? "ET Trick Widget"
  }
}

struct TrickHomeWidget: Widget {
  let kind = "TrickHomeWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: TrickProvider()) { entry in
      TrickHomeWidgetView(entry: entry)
    }
    .configurationDisplayName("ET Trick Widget")
    .description("Home-screen widget for the Trick showcase")
    .supportedFamilies([.systemSmall])
  }
}

struct TrickHomeWidgetView: View {
  var entry: TrickProvider.Entry

  var body: some View {
    if #available(iOS 17.0, *) {
      content.containerBackground(for: .widget) {
        Color("BackgroundColor", bundle: .main)
      }
    } else {
      content.background(Color("BackgroundColor", bundle: .main))
    }
  }

  private var content: some View {
    VStack(spacing: 10) {
      Image(systemName: "sparkles")
        .font(.system(size: 28))
        .foregroundColor(Color("AccentColor", bundle: .main))
      Text(entry.message)
        .font(.footnote.weight(.semibold))
        .foregroundColor(Color("TextPrimary", bundle: .main))
        .multilineTextAlignment(.center)
    }
    .padding(8)
  }
}

// MARK: - Live Activity

struct TrickActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var status: String
  }

  var title: String
}

struct TrickLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TrickActivityAttributes.self) { context in
      TrickLiveActivityContent(context: context)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text("ET Trick")
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(context.state.status)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text(context.attributes.title)
        }
      } compactLeading: {
        Image(systemName: "sparkles")
      } compactTrailing: {
        Text(context.state.status).font(.caption2)
      } minimal: {
        Image(systemName: "sparkles")
      }
    }
    // Opt into watchOS Smart Stack (WWDC24) — required for Watch full-demo green.
    .supplementalActivityFamilies([.small])
  }
}

struct TrickLiveActivityContent: View {
  @Environment(\.activityFamily) private var activityFamily
  var context: ActivityViewContext<TrickActivityAttributes>

  var body: some View {
    switch activityFamily {
    case .small:
      VStack(alignment: .leading, spacing: 2) {
        Text(context.attributes.title)
          .font(.headline)
          .minimumScaleFactor(0.7)
        Text(context.state.status)
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      .padding(8)
    default:
      VStack(alignment: .leading, spacing: 4) {
        Text(context.attributes.title)
          .font(.headline)
        Text(context.state.status)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
      .padding()
      .activityBackgroundTint(Color.black.opacity(0.85))
      .activitySystemActionForegroundColor(.white)
    }
  }
}

@main
struct TrickWidgetsBundle: WidgetBundle {
  var body: some Widget {
    TrickHomeWidget()
    TrickLiveActivity()
  }
}
