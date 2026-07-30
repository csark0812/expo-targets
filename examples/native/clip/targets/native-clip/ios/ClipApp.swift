import SwiftUI

@main
struct NativeClipApp: App {
    @State private var invocationURL: URL?

    var body: some Scene {
        WindowGroup {
            ClipView(invocationURL: invocationURL)
                .onOpenURL { url in
                    invocationURL = url
                }
        }
    }
}
