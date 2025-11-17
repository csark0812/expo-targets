import WidgetKit
import SwiftUI

struct DemoEntry: TimelineEntry {
    let date: Date
    let message: String
}

struct Provider: TimelineProvider {
    let appGroup = "group.com.test.alltargetsdemo"

    func placeholder(in context: Context) -> DemoEntry {
        DemoEntry(date: Date(), message: "Demo Widget")
    }

    func getSnapshot(in context: Context, completion: @escaping (DemoEntry) -> ()) {
        let entry = DemoEntry(date: Date(), message: loadMessage())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DemoEntry>) -> ()) {
        let entry = DemoEntry(date: Date(), message: loadMessage())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadMessage() -> String {
        let defaults = UserDefaults(suiteName: appGroup)
        if let data = defaults?.dictionary(forKey: "DemoWidget:data"),
           let message = data["message"] as? String {
            return message
        }
        return "All Targets Demo"
    }
}

@main
struct DemoWidget: Widget {
    let kind: String = "DemoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DemoWidgetView(entry: entry)
        }
        .configurationDisplayName("Demo Widget")
        .description("Demonstrates widget configuration")
        .supportedFamilies([.systemSmall])
    }
}

struct DemoWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            Color("BackgroundColor")

            VStack(spacing: 8) {
                Image(systemName: "star.fill")
                    .font(.system(size: 32))
                    .foregroundColor(Color("AccentColor"))

                Text(entry.message)
                    .font(.body)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .padding()
        }
    }
}

