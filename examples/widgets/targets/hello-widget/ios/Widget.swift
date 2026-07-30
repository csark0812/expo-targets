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
