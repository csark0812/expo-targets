import SwiftUI

/// Minimal watch companion so watch-widget nests under a real Watch .app.
@main
struct ETWatchCompanionApp: App {
  var body: some Scene {
    WindowGroup {
      Text("ET Watch Target")
        .padding()
    }
  }
}
