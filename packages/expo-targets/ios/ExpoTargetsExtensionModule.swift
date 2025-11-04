import ExpoModulesCore
import UIKit

public class ExpoTargetsExtensionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoTargetsExtension")

    Function("closeExtension") { () -> Void in
      DispatchQueue.main.async {
        NotificationCenter.default.post(name: NSNotification.Name("ExpoTargetsCloseExtension"), object: nil)
      }
    }

    Function("openHostApp") { (path: String) -> Void in
      DispatchQueue.main.async {
        let userInfo: [String: String] = ["path": path]
        NotificationCenter.default.post(name: NSNotification.Name("ExpoTargetsOpenHostApp"), object: nil, userInfo: userInfo)
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
    // First, try to find through window hierarchy
    let windows: [UIWindow]
    if #available(iOS 15.0, *) {
      let scenes = UIApplication.shared.connectedScenes
      let windowScenes = scenes.compactMap { $0 as? UIWindowScene }
      windows = windowScenes.flatMap { $0.windows }
    } else {
      windows = UIApplication.shared.windows
    }

    for window in windows {
      if let rootVC = window.rootViewController {
        if let context = findExtensionContext(in: rootVC) {
          return context
        }
      }
    }

    // Fallback: search through responder chain from any visible window
    for window in windows {
      var responder: UIResponder? = window.rootViewController
      while responder != nil {
        if let viewController = responder as? UIViewController {
          if let context = viewController.extensionContext {
            return context
          }
          // Also check nested view controllers
          if let context = findExtensionContext(in: viewController) {
            return context
          }
        }
        responder = responder?.next
      }
    }

    return nil
  }

  private func findExtensionContext(in viewController: UIViewController) -> NSExtensionContext? {
    // Check the view controller itself
    if let context = viewController.extensionContext {
      return context
    }

    // Check presented view controllers
    if let presented = viewController.presentedViewController {
      if let context = findExtensionContext(in: presented) {
        return context
      }
    }

    // Check child view controllers
    for childVC in viewController.children {
      if let context = findExtensionContext(in: childVC) {
        return context
      }
    }

    // Check container view controllers
    if let navController = viewController as? UINavigationController {
      if let topVC = navController.topViewController {
        if let context = findExtensionContext(in: topVC) {
          return context
        }
      }
      if let visibleVC = navController.visibleViewController {
        if let context = findExtensionContext(in: visibleVC) {
          return context
        }
      }
    }

    if let tabController = viewController as? UITabBarController {
      if let selectedVC = tabController.selectedViewController {
        if let context = findExtensionContext(in: selectedVC) {
          return context
        }
      }
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

