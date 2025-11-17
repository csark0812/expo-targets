import SwiftUI

struct ClipView: View {
    let invocationURL: URL?

    var body: some View {
        ZStack {
            Color("BackgroundColor")
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Image(systemName: "app.badge")
                    .font(.system(size: 60))
                    .foregroundColor(Color("AccentColor"))

                Text("Demo App Clip")
                    .font(.title)
                    .fontWeight(.bold)

                Text("All Targets Demo")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                if let url = invocationURL {
                    Text("URL: \(url.absoluteString)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding()
                }
            }
            .padding()
        }
    }
}

