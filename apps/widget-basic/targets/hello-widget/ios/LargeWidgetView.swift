import SwiftUI
import WidgetKit

struct LargeWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Hello Widget")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(Color("$accent"))
                Spacer()
                Image(systemName: "star.circle.fill")
                    .font(.largeTitle)
                    .foregroundColor(Color("$accent"))
            }

            Divider()

            VStack(alignment: .leading, spacing: 12) {
                Text("Message")
                    .font(.headline)
                    .foregroundColor(.secondary)

                Text(entry.message)
                    .font(.title3)
                    .foregroundColor(.primary)
                    .lineLimit(5)
            }

            Spacer()

            HStack {
                Text("Last Updated")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                Spacer()
                Text(entry.date, style: .time)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color("$widgetBackground"))
    }
}

