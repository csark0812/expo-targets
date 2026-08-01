// App Clip Data Loading

private var clipInvocationURL: String?
private var clipMetadata: [String: Any] = [:]

private func loadClipContent() {
    // App Clips receive invocation URLs via UIApplicationDelegate openURL /
    // continue userActivity (see ReactNativeClipApp). Seed from launch if posted.
    if let url = clipInvocationURL {
        return
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
