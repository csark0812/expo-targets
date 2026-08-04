import Foundation
import IdentityLookup

/// Real IdentityLookup message filter — filters probe SMS and records App Group markers.
@objc(MessageFilterExtension)
final class MessageFilterExtension: ILMessageFilterExtension {}

extension MessageFilterExtension: ILMessageFilterQueryHandling {
  func handle(
    _ queryRequest: ILMessageFilterQueryRequest,
    context: ILMessageFilterExtensionContext,
    completion: @escaping (ILMessageFilterQueryResponse) -> Void
  ) {
    let response = ILMessageFilterQueryResponse()
    let body = (queryRequest.messageBody ?? "").lowercased()
    let sender = (queryRequest.sender ?? "").lowercased()
    let isProbe =
      body.contains("expo-targets") || body.contains("et filter")
      || sender.contains("555")

    // Filter probe traffic so SMS Filtering enablement has an observable effect.
    response.action = isProbe ? .filter : .none

    let defaults = UserDefaults(
      suiteName: "group.com.expotargets.example.message-filter"
    )
    defaults?.set(queryRequest.messageBody ?? "", forKey: "msgFilter:lastBody")
    defaults?.set(queryRequest.sender ?? "", forKey: "msgFilter:lastSender")
    defaults?.set(
      isProbe ? "filter" : "none",
      forKey: "msgFilter:lastAction"
    )
    defaults?.set(Date().timeIntervalSince1970, forKey: "msgFilter:lastAt")
    defaults?.synchronize()

    completion(response)
  }
}
