import SwiftUI

@main
struct PoplClipApp: App {
  @State private var incomingURL: URL? = nil
  @State private var isContactLoading: Bool = true
  private let contentHelper = ContentHelper();

  var body: some Scene {
    WindowGroup {
      ContentView(url: incomingURL, isContactLoading: isContactLoading)
        .onAppear{
          contentHelper.warmUpContactView()
        }
        .onOpenURL { url in
          contentHelper.handleUniversalLink(url) {
            isContactLoading = false
          }
          incomingURL = url
        }
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { userActivity in
          if let url = userActivity.webpageURL {
            contentHelper.handleUniversalLink(url) {
              isContactLoading = false
            }
            incomingURL = url
          }
        }
    }
  }
}

