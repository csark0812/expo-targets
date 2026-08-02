import NetworkExtension

/// Minimal app proxy — real NEAppProxyProvider subclass.
@objc(AppProxyProvider)
class AppProxyProvider: NEAppProxyProvider {
  override func startProxy(
    options: [String: Any]?,
    completionHandler: @escaping (Error?) -> Void
  ) {
    completionHandler(
      NSError(
        domain: "ETNEProxy",
        code: 1,
        userInfo: [
          NSLocalizedDescriptionKey:
            "expo-targets example: Network Extension entitlement required",
        ]
      )
    )
  }

  override func stopProxy(with reason: NEProviderStopReason, completionHandler: @escaping () -> Void) {
    completionHandler()
  }

  override func handleNewFlow(_ flow: NEAppProxyFlow) -> Bool {
    false
  }
}
