import SwiftUI
import WidgetKit

struct MediumWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Hello Widget")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(Color("$accent"))

                Text(entry.message)
                    .font(.body)
                    .foregroundColor(.primary)
                    .lineLimit(3)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Image(systemName: "star.fill")
                    .font(.largeTitle)
                    .foregroundColor(Color("$accent"))

                Text(entry.date, style: .time)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color("$widgetBackground"))
    }
}

