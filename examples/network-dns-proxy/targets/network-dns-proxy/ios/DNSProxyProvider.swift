import NetworkExtension

/// Minimal DNS proxy — real NEDNSProxyProvider subclass.
@objc(DNSProxyProvider)
class DNSProxyProvider: NEDNSProxyProvider {
  override func startProxy(
    options: [String: Any]?,
    completionHandler: @escaping (Error?) -> Void
  ) {
    completionHandler(
      NSError(
        domain: "ETNEDNS",
        code: 1,
        userInfo: [
          NSLocalizedDescriptionKey:
            "expo-targets example: Network Extension entitlement required",
        ]
      )
    )
  }

  override func stopProxy(
    with reason: NEProviderStopReason,
    completionHandler: @escaping () -> Void
  ) {
    completionHandler()
  }

  override func handleNewFlow(_ flow: NEAppProxyFlow) -> Bool {
    false
  }
}
