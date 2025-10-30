import ExpoModulesCore
import UIKit

public class ExpoTargetsExtensionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoTargetsExtension")

    Function("closeExtension") { () -> Void in
      if let extensionContext = self.findExtensionContext() {
        extensionContext.completeRequest(returningItems: nil, completionHandler: nil)
      }
    }

    Function("openHostApp") { (path: String) -> Void in
      guard let bundleIdentifier = Bundle.main.bundleIdentifier else { return }
      // Remove common extension suffixes to get host app bundle ID
      let extensionSuffixes = [".ShareExtension", ".share", ".action", ".clip"]
      var appBundleId = bundleIdentifier

      for suffix in extensionSuffixes {
        appBundleId = appBundleId.replacingOccurrences(of: suffix, with: "")
      }

      if let url = URL(string: "\(appBundleId)://\(path)") {
        self.openURL(url)
      }
    }

    Function("getSharedData") { () -> [String: Any]? in
      guard let extensionContext = self.findExtensionContext() else { return nil }
      guard let extensionItem = extensionContext.inputItems.first as? NSExtensionItem else { return nil }
      guard let attachments = extensionItem.attachments else { return nil }

      var result: [String: Any] = [:]
      let group = DispatchGroup()

      for attachment in attachments {
        // Text
        if attachment.hasItemConformingToTypeIdentifier("public.plain-text") {
          group.enter()
          attachment.loadItem(forTypeIdentifier: "public.plain-text", options: nil) { data, error in
            defer { group.leave() }
            if let text = data as? String {
              result["text"] = text
            }
          }
        }

        // URL
        if attachment.hasItemConformingToTypeIdentifier("public.url") {
          group.enter()
          attachment.loadItem(forTypeIdentifier: "public.url", options: nil) { data, error in
            defer { group.leave() }
            if let url = data as? URL {
              result["url"] = url.absoluteString
            }
          }
        }

        // Images
        if attachment.hasItemConformingToTypeIdentifier("public.image") {
          group.enter()
          attachment.loadItem(forTypeIdentifier: "public.image", options: nil) { data, error in
            defer { group.leave() }
            if let url = data as? URL {
              var images = result["images"] as? [String] ?? []
              images.append(url.absoluteString)
              result["images"] = images
            }
          }
        }
      }

      group.wait()
      return result.isEmpty ? nil : result
    }
  }

  private func findExtensionContext() -> NSExtensionContext? {
    guard let windowScene = UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene,
          let rootViewController = windowScene.windows.first?.rootViewController else {
      return nil
    }

    var currentVC: UIViewController? = rootViewController
    while currentVC != nil {
      if let extensionContext = currentVC?.extensionContext {
        return extensionContext
      }
      currentVC = currentVC?.presentedViewController ?? currentVC?.children.first
    }

    return nil
  }

  @discardableResult
  private func openURL(_ url: URL) -> Bool {
    // Use responder chain to find UIApplication
    // extensionContext.open() doesn't work reliably in share extensions
    var responder: UIResponder? = UIApplication.shared.delegate as? UIResponder

    while responder != nil {
      if let application = responder as? UIApplication {
        application.open(url, options: [:], completionHandler: nil)
        return true
      }
      responder = responder?.next
    }

    // Fallback: try UIApplication.shared directly
    if UIApplication.shared.canOpenURL(url) {
      UIApplication.shared.open(url, options: [:], completionHandler: nil)
      return true
    }

    return false
  }
}

