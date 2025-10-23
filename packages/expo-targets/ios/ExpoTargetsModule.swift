import ExpoModulesCore
import WidgetKit
import UIKit

public class ExpoTargetsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoTargets")

    Function("setInt") { (key: String, value: Int, suite: String?) -> Void in
      let defaults = UserDefaults(suiteName: suite ?? "")
      defaults?.set(value, forKey: key)
      defaults?.synchronize()
    }

    Function("setString") { (key: String, value: String, suite: String?) -> Void in
      let defaults = UserDefaults(suiteName: suite ?? "")
      defaults?.set(value, forKey: key)
      defaults?.synchronize()
    }

    Function("setObject") { (key: String, value: [String: Any], suite: String?) -> Bool in
      let defaults = UserDefaults(suiteName: suite ?? "")
      defaults?.set(value, forKey: key)
      defaults?.synchronize()
      return true
    }

    Function("get") { (key: String, suite: String?) -> String? in
      let defaults = UserDefaults(suiteName: suite ?? "")
      return defaults?.string(forKey: key)
    }

    Function("remove") { (key: String, suite: String?) -> Void in
      let defaults = UserDefaults(suiteName: suite ?? "")
      defaults?.removeObject(forKey: key)
      defaults?.synchronize()
    }

    Function("refreshTarget") { (name: String?) -> Void in
      // Refresh widgets
      if #available(iOS 14.0, *) {
        if let targetName = name {
          WidgetCenter.shared.reloadTimelines(ofKind: targetName)
        } else {
          WidgetCenter.shared.reloadAllTimelines()
        }
      }

      // Refresh controls (iOS 18+)
      if #available(iOS 18.0, *) {
        if let targetName = name {
          ControlCenter.shared.reloadControls(ofKind: targetName)
        } else {
          ControlCenter.shared.reloadAllControls()
        }
      }
    }

    Function("closeExtension") { () -> Void in
      if let extensionContext = self.findExtensionContext() {
        extensionContext.completeRequest(returningItems: nil, completionHandler: nil)
      }
    }

    Function("openHostApp") { (path: String) -> Void in
      guard let bundleIdentifier = Bundle.main.bundleIdentifier else { return }
      let appBundleId = bundleIdentifier.replacingOccurrences(of: ".ShareExtension", with: "")
      if let url = URL(string: "\(appBundleId)://\(path)") {
        self.openURL(url)
      }
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
    if let extensionContext = findExtensionContext() {
      extensionContext.open(url) { _ in }
      return true
    }

    if UIApplication.shared.canOpenURL(url) {
      UIApplication.shared.open(url, options: [:], completionHandler: nil)
      return true
    }

    return false
  }
}

