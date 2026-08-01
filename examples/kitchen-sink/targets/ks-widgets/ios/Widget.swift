import WidgetKit
import SwiftUI

struct KsEntry: TimelineEntry {
    let date: Date
    let message: String
}

struct KsProvider: TimelineProvider {
    let appGroup = "group.com.expotargets.example.kitchensink"

    func placeholder(in context: Context) -> KsEntry {
        KsEntry(date: Date(), message: "KS Widget")
    }

    func getSnapshot(in context: Context, completion: @escaping (KsEntry) -> ()) {
        completion(KsEntry(date: Date(), message: loadMessage()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<KsEntry>) -> ()) {
        let entry = KsEntry(date: Date(), message: loadMessage())
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func loadMessage() -> String {
        UserDefaults(suiteName: appGroup)?.string(forKey: "KsWidget:message") ?? "No message yet"
    }
}

@main
struct KsWidget: Widget {
    let kind: String = "KsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: KsProvider()) { entry in
            KsWidgetView(entry: entry)
        }
        .configurationDisplayName("KS Widget")
        .description("Kitchen sink hello widget")
        .supportedFamilies([.systemSmall])
    }
}

struct KsWidgetView: View {
    var entry: KsProvider.Entry

    var body: some View {
        ZStack {
            Color("BackgroundColor")
            VStack(spacing: 8) {
                Image(systemName: "square.grid.2x2")
                    .foregroundColor(Color("AccentColor"))
                Text(entry.message)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(Color("TextPrimary"))
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
            }
            .padding()
        }
    }
}
