// App Clip Data Loading

private var clipInvocationURL: String?
private var clipMetadata: [String: Any] = [:]

private func loadClipContent() {
    // App Clips typically receive data via URL and scene activation
    // This is populated from scene delegate / app launch
    if let userActivity = extensionContext?.intent as? NSUserActivity,
       let url = userActivity.webpageURL {
        clipInvocationURL = url.absoluteString
    }
}

private func getClipDataProps() -> [String: Any] {
    var data: [String: Any] = [:]

    if let url = clipInvocationURL {
        data["invocationURL"] = url
    }

    if !clipMetadata.isEmpty {
        data["metadata"] = clipMetadata
    }

    return data
}

