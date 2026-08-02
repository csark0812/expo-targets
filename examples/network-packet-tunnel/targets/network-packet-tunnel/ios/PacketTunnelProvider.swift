import NetworkExtension

/// Minimal packet tunnel — real NEPacketTunnelProvider subclass.
/// Full VPN requires Network Extension entitlement (os-limit in Devicewright).
@objc(PacketTunnelProvider)
class PacketTunnelProvider: NEPacketTunnelProvider {
  override func startTunnel(
    options: [String: NSObject]?,
    completionHandler: @escaping (Error?) -> Void
  ) {
    completionHandler(
      NSError(
        domain: "ETNETunnel",
        code: 1,
        userInfo: [
          NSLocalizedDescriptionKey:
            "expo-targets example: Network Extension entitlement required",
        ]
      )
    )
  }

  override func stopTunnel(
    with reason: NEProviderStopReason,
    completionHandler: @escaping () -> Void
  ) {
    completionHandler()
  }
}
