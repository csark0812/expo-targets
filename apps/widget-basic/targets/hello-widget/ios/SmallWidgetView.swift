import SwiftUI
import WidgetKit

struct SmallWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Hello")
                .font(.headline)
                .foregroundColor(Color("$accent"))

            Spacer()

            Text(entry.message)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)

            Text(entry.date, style: .time)
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color("$widgetBackground"))
    }
}

