import WidgetKit
import SwiftUI

struct CounterEntry: TimelineEntry {
    let date: Date
    let count: Int
    let label: String?
}

struct Provider: TimelineProvider {
    let appGroup = "group.com.test.widgetshowcase"

    func placeholder(in context: Context) -> CounterEntry {
        CounterEntry(date: Date(), count: 0, label: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (CounterEntry) -> ()) {
        let entry = loadCounterEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CounterEntry>) -> ()) {
        let entry = loadCounterEntry()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadCounterEntry() -> CounterEntry {
        guard let defaults = UserDefaults(suiteName: appGroup) else {
            return CounterEntry(date: Date(), count: 0, label: nil)
        }

        let count = defaults.integer(forKey: "count")
        let label = defaults.string(forKey: "label")

        return CounterEntry(date: Date(), count: count, label: label)
    }
}

@main
struct CounterWidget: Widget {
    let kind: String = "CounterWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            CounterWidgetView(entry: entry)
        }
        .configurationDisplayName("Counter Widget")
        .description("Track counts and numbers")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct CounterWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: Provider.Entry

    var body: some View {
        ZStack {
            Color("BackgroundColor")

            if family == .systemSmall {
                VStack(spacing: 8) {
                    Text("\(entry.count)")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(Color("AccentColor"))

                    if let label = entry.label, !label.isEmpty {
                        Text(label)
                            .font(.caption)
                            .foregroundColor(Color("TextSecondary"))
                            .lineLimit(1)
                    } else {
                        Text("Count")
                            .font(.caption)
                            .foregroundColor(Color("TextSecondary"))
                    }
                }
                .padding()
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "number.circle.fill")
                            .font(.title2)
                            .foregroundColor(Color("AccentColor"))
                        Text("Counter")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(Color("TextPrimary"))
                        Spacer()
                    }

                    Divider()

                    VStack(alignment: .leading, spacing: 8) {
                        Text("\(entry.count)")
                            .font(.system(size: 56, weight: .bold))
                            .foregroundColor(Color("AccentColor"))

                        if let label = entry.label, !label.isEmpty {
                            Text(label)
                                .font(.subheadline)
                                .foregroundColor(Color("TextSecondary"))
                        } else {
                            Text("No label set")
                                .font(.subheadline)
                                .foregroundColor(Color("TextSecondary"))
                        }
                    }

                    Spacer()
                }
                .padding()
            }
        }
    }
}

