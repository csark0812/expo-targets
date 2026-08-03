import SafariServices
import os.log

/// Native message handler for Safari example.
/// Called when JavaScript uses `browser.runtime.sendNativeMessage()`.
class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
  private let appGroup = "group.com.expotargets.example.safari"

  func beginRequest(with context: NSExtensionContext) {
    let request = context.inputItems.first as? NSExtensionItem

    let message: Any?
    if #available(iOS 15.0, *) {
      message = request?.userInfo?[SFExtensionMessageKey]
    } else {
      message = request?.userInfo?["message"]
    }

    os_log(.default, "Safari received native message: %{public}@", String(describing: message))

    var responseData: [String: Any] = [
      "status": "ok",
      "extensionName": "Safari",
      "marker": "expo-targets uitest safari native-msg",
    ]
    if let messageDict = message as? [String: Any] {
      responseData["received"] = messageDict
      responseData["timestamp"] = Date().timeIntervalSince1970
    }

    if let defaults = UserDefaults(suiteName: appGroup) {
      defaults.set("expo-targets uitest safari native-msg", forKey: "safari:lastNativeMsg")
      defaults.set(Date().timeIntervalSince1970, forKey: "safari:lastNativeMsgAt")
      defaults.synchronize()
    }

    let response = NSExtensionItem()
    if #available(iOS 15.0, *) {
      response.userInfo = [SFExtensionMessageKey: responseData]
    } else {
      response.userInfo = ["message": responseData]
    }
    context.completeRequest(returningItems: [response], completionHandler: nil)
  }
}
