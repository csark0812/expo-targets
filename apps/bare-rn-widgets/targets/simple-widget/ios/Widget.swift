import WidgetKit
import SwiftUI

struct SimpleEntry: TimelineEntry {
    let date: Date
    let message: String
}

struct Provider: TimelineProvider {
    let appGroup = "group.com.test.barernwidgets"

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), message: "Simple Widget!")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), message: loadMessage())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let entry = SimpleEntry(date: Date(), message: loadMessage())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadMessage() -> String {
        let defaults = UserDefaults(suiteName: appGroup)
        if let data = defaults?.dictionary(forKey: "SimpleWidget:data"),
           let message = data["message"] as? String {
            return message
        }
        return "No message yet"
    }
}

@main
struct SimpleWidget: Widget {
    let kind: String = "SimpleWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            SimpleWidgetView(entry: entry)
        }
        .configurationDisplayName("Simple Widget")
        .description("A simple message widget")
        .supportedFamilies([.systemSmall])
    }
}

struct SimpleWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            Color("BackgroundColor")

            VStack(spacing: 12) {
                Image(systemName: "star.fill")
                    .font(.system(size: 32))
                    .foregroundColor(Color("AccentColor"))

                Text(entry.message)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(Color("TextPrimary"))
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
            }
            .padding()
        }
    }
}

