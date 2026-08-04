import SwiftUI

/// Minimal watch companion UI so the host scheme links and Watch AX can see chrome.
@main
struct ETWatchCompanionApp: App {
  var body: some Scene {
    WindowGroup {
      Text("ET Watch Target")
        .padding()
    }
  }
}
