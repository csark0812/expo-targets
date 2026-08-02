import NetworkExtension

/// Minimal filter data provider — real NEFilterDataProvider subclass.
@objc(FilterDataProvider)
class FilterDataProvider: NEFilterDataProvider {
  override func startFilter(completionHandler: @escaping (Error?) -> Void) {
    completionHandler(
      NSError(
        domain: "ETNEFilter",
        code: 1,
        userInfo: [
          NSLocalizedDescriptionKey:
            "expo-targets example: Network Extension entitlement required",
        ]
      )
    )
  }

  override func stopFilter(
    with reason: NEProviderStopReason,
    completionHandler: @escaping () -> Void
  ) {
    completionHandler()
  }
}
