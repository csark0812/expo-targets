import ExpoModulesCore
import WidgetKit

public class ExpoTargetsStorageModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoTargetsStorage")

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
  }
}

