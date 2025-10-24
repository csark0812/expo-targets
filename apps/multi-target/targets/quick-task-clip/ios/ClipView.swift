import SwiftUI

struct ClipView: View {
    let invocationURL: URL?
    @State private var taskText: String = ""
    @State private var tasks: [TaskItem] = []
    @State private var showSuccess = false

    let appGroup = "group.com.test.multitarget"

    var body: some View {
        ZStack {
            Color("BackgroundColor")
                .ignoresSafeArea()

            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("✅")
                        .font(.system(size: 60))

                    Text("Quick Task")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(Color("TextPrimary"))

                    Text("Add tasks in seconds")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 40)

                // Add task input
                VStack(alignment: .leading, spacing: 12) {
                    Text("NEW TASK")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)

                    HStack {
                        TextField("What needs to be done?", text: $taskText)
                            .textFieldStyle(.plain)
                            .padding()
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(12)

                        Button(action: addTask) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 32))
                                .foregroundColor(taskText.isEmpty ? .gray : Color("AccentColor"))
                        }
                        .disabled(taskText.isEmpty)
                    }
                }
                .padding(.horizontal)

                // Recent tasks
                if !tasks.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("RECENT TASKS")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)

                        VStack(spacing: 8) {
                            ForEach(tasks.prefix(3)) { task in
                                HStack(alignment: .top, spacing: 12) {
                                    Text("○")
                                        .font(.title3)
                                        .foregroundColor(Color("AccentColor"))
                                    Text(task.text)
                                        .font(.body)
                                        .foregroundColor(Color("TextPrimary"))
                                        .lineLimit(2)
                                    Spacer()
                                }
                                .padding(12)
                                .background(Color.gray.opacity(0.05))
                                .cornerRadius(10)
                            }
                        }
                    }
                    .padding(.horizontal)
                }

                Spacer()

                // Open full app button
                Button(action: {
                    if let url = URL(string: "multitarget://tasks") {
                        UIApplication.shared.open(url)
                    }
                }) {
                    Text("Open Full App")
                        .fontWeight(.medium)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray.opacity(0.2))
                        .foregroundColor(Color("TextPrimary"))
                        .cornerRadius(12)
                }
                .padding(.horizontal)

                // App Clip badge
                HStack {
                    Image(systemName: "app.badge")
                        .font(.caption)
                    Text("This is an App Clip")
                        .font(.caption)
                }
                .foregroundColor(.secondary)
                .padding(.bottom, 20)
            }

            // Success overlay
            if showSuccess {
                VStack {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(Color("AccentColor"))
                    Text("Task Added!")
                        .font(.title2)
                        .fontWeight(.bold)
                        .padding(.top, 8)
                }
                .padding(40)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color("BackgroundColor"))
                        .shadow(radius: 20)
                )
                .transition(.scale)
            }
        }
        .onAppear {
            loadTasks()
        }
    }

    private func addTask() {
        guard !taskText.isEmpty else { return }

        let newTask = TaskItem(
            id: UUID().uuidString,
            text: taskText,
            completed: false,
            createdAt: Date().timeIntervalSince1970
        )

        var currentTasks = tasks
        currentTasks.insert(newTask, at: 0)

        // Save to App Group
        struct TasksData: Codable {
            let tasks: [TaskItem]
        }

        if let defaults = UserDefaults(suiteName: appGroup) {
            let tasksData = TasksData(tasks: currentTasks)
            if let jsonData = try? JSONEncoder().encode(tasksData),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                defaults.set(jsonString, forKey: "TaskWidget:data")
                defaults.synchronize()
            }
        }

        tasks = currentTasks
        taskText = ""

        // Show success animation
        withAnimation {
            showSuccess = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            withAnimation {
                showSuccess = false
            }
        }
    }

    private func loadTasks() {
        struct TasksData: Codable {
            let tasks: [TaskItem]
        }

        guard let defaults = UserDefaults(suiteName: appGroup),
              let jsonString = defaults.string(forKey: "TaskWidget:data"),
              let jsonData = jsonString.data(using: .utf8),
              let tasksData = try? JSONDecoder().decode(TasksData.self, from: jsonData) else {
            return
        }

        tasks = tasksData.tasks.filter { !$0.completed }
    }
}

struct TaskItem: Codable, Identifiable {
    let id: String
    let text: String
    let completed: Bool
    let createdAt: Double
}

#Preview {
    ClipView(invocationURL: nil)
}

