import WidgetKit
import SwiftUI

struct TaskEntry: TimelineEntry {
    let date: Date
    let tasks: [TaskItem]
}

struct TaskItem: Codable, Identifiable {
    let id: String
    let text: String
    let completed: Bool
    let createdAt: Double
}

struct Provider: TimelineProvider {
    let appGroup = "group.com.test.multitarget"

    func placeholder(in context: Context) -> TaskEntry {
        TaskEntry(date: Date(), tasks: [
            TaskItem(id: "1", text: "Sample task", completed: false, createdAt: Date().timeIntervalSince1970)
        ])
    }

    func getSnapshot(in context: Context, completion: @escaping (TaskEntry) -> ()) {
        let entry = TaskEntry(date: Date(), tasks: loadTasks())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TaskEntry>) -> ()) {
        let currentDate = Date()
        let tasks = loadTasks()

        let entry = TaskEntry(date: currentDate, tasks: tasks)

        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadTasks() -> [TaskItem] {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let jsonString = defaults.string(forKey: "TaskWidget:data"),
              let jsonData = jsonString.data(using: .utf8) else {
            return []
        }

        struct TasksData: Codable {
            let tasks: [TaskItem]
        }

        let tasksData = (try? JSONDecoder().decode(TasksData.self, from: jsonData))
        let tasks = tasksData?.tasks ?? []
        return tasks.filter { !$0.completed }.prefix(5).map { $0 }
    }
}

@main
struct TaskWidget: Widget {
    let kind: String = "TaskWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            TaskWidgetView(entry: entry)
        }
        .configurationDisplayName("Tasks")
        .description("Your active tasks at a glance")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct TaskWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: TaskEntry

    var body: some View {
        ZStack {
            Color("BackgroundColor")

            VStack(alignment: .leading, spacing: 8) {
                // Header
                HStack {
                    Text("✅")
                        .font(.title2)
                    Text("Tasks")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(Color("TextPrimary"))
                    Spacer()
                    Text("\(entry.tasks.count)")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(Color("AccentColor"))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color("AccentColor").opacity(0.2))
                        .cornerRadius(8)
                }

                if entry.tasks.isEmpty {
                    Spacer()
                    HStack {
                        Spacer()
                        VStack(spacing: 4) {
                            Text("🎉")
                                .font(.largeTitle)
                            Text("All done!")
                                .font(.caption)
                                .foregroundColor(Color("TextSecondary"))
                        }
                        Spacer()
                    }
                    Spacer()
                } else {
                    Divider()

                    VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 8) {
                        ForEach(entry.tasks.prefix(family == .systemSmall ? 3 : 5)) { task in
                            HStack(alignment: .top, spacing: 8) {
                                Text("○")
                                    .font(.caption)
                                    .foregroundColor(Color("AccentColor"))
                                Text(task.text)
                                    .font(family == .systemSmall ? .caption2 : .caption)
                                    .foregroundColor(Color("TextPrimary"))
                                    .lineLimit(family == .systemSmall ? 1 : 2)
                            }
                        }
                    }

                    Spacer()
                }
            }
            .padding()
        }
    }
}

