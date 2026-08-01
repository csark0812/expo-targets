import WidgetKit
import SwiftUI

struct HelloEntry: TimelineEntry {
    let date: Date
    let message: String
}

struct Provider: TimelineProvider {
    let appGroup = "group.com.expotargets.example.widgets"

    func placeholder(in context: Context) -> HelloEntry {
        HelloEntry(date: Date(), message: "Hello Widget!")
    }

    func getSnapshot(in context: Context, completion: @escaping (HelloEntry) -> ()) {
        completion(HelloEntry(date: Date(), message: loadMessage()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HelloEntry>) -> ()) {
        let entry = HelloEntry(date: Date(), message: loadMessage())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func loadMessage() -> String {
        UserDefaults(suiteName: appGroup)?.string(forKey: "HelloWidget:message") ?? "No message yet"
    }
}

@main
struct HelloWidget: Widget {
    let kind: String = "HelloWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            HelloWidgetView(entry: entry)
        }
        .configurationDisplayName("Hello Widget")
        .description("A simple message widget")
        .supportedFamilies([.systemSmall])
    }
}

struct HelloWidgetView: View {
    var entry: Provider.Entry

    private var background: Color {
        Color("BackgroundColor", bundle: .main)
    }

    private var accent: Color {
        Color("AccentColor", bundle: .main)
    }

    private var textPrimary: Color {
        Color("TextPrimary", bundle: .main)
    }

    @ViewBuilder
    var body: some View {
        // iOS 17+: without containerBackground, WidgetKit often paints a blank white tile.
        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) {
                background
            }
        } else {
            content.background(background)
        }
    }

    private var content: some View {
        VStack(spacing: 12) {
            Image(systemName: "star.fill")
                .font(.system(size: 32))
                .foregroundColor(accent)
            Text(entry.message)
                .font(.body)
                .fontWeight(.semibold)
                .foregroundColor(textPrimary)
                .multilineTextAlignment(.center)
                .lineLimit(3)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
