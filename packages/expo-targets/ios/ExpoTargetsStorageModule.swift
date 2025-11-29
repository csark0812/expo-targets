import ExpoModulesCore
import WidgetKit

public class ExpoTargetsStorageModule: Module {
  private func resolveKey(_ key: String, targetName: String?) -> String {
    guard let targetName = targetName, !targetName.isEmpty else {
      return key
    }
    return "\(targetName):\(key)"
  }

  public func definition() -> ModuleDefinition {
    Name("ExpoTargetsStorage")

    Function("setInt") { (key: String, value: Int, suite: String?, targetName: String?) -> Void in
      let defaults = UserDefaults(suiteName: suite ?? "")
      defaults?.set(value, forKey: self.resolveKey(key, targetName: targetName))
      defaults?.synchronize()
    }

    Function("setString") { (key: String, value: String, suite: String?, targetName: String?) -> Void in
      let defaults = UserDefaults(suiteName: suite ?? "")
      defaults?.set(value, forKey: self.resolveKey(key, targetName: targetName))
      defaults?.synchronize()
    }

    Function("setObject") { (key: String, value: [String: Any], suite: String?, targetName: String?) -> Bool in
      let defaults = UserDefaults(suiteName: suite ?? "")
      defaults?.set(value, forKey: self.resolveKey(key, targetName: targetName))
      defaults?.synchronize()
      return true
    }

    Function("get") { (key: String, suite: String?, targetName: String?) -> String? in
      let defaults = UserDefaults(suiteName: suite ?? "")
      return defaults?.string(forKey: self.resolveKey(key, targetName: targetName))
    }

    Function("remove") { (key: String, suite: String?, targetName: String?) -> Void in
      let defaults = UserDefaults(suiteName: suite ?? "")
      defaults?.removeObject(forKey: self.resolveKey(key, targetName: targetName))
      defaults?.synchronize()
    }

    Function("getAllKeys") { (suite: String?, targetName: String?) -> [String] in
      let defaults = UserDefaults(suiteName: suite ?? "")
      guard let dict = defaults?.dictionaryRepresentation() else {
        return []
      }
      let allKeys = Array(dict.keys)
      guard let targetName = targetName, !targetName.isEmpty else {
        return allKeys
      }
      let prefix = "\(targetName):"
      return allKeys
        .filter { $0.hasPrefix(prefix) }
        .map { String($0.dropFirst(prefix.count)) }
    }

    Function("getAllData") { (suite: String?, targetName: String?) -> [String: Any] in
      let defaults = UserDefaults(suiteName: suite ?? "")
      guard let dict = defaults?.dictionaryRepresentation() else {
        return [:]
      }
      guard let targetName = targetName, !targetName.isEmpty else {
        return dict
      }
      let prefix = "\(targetName):"
      var result: [String: Any] = [:]
      for (key, value) in dict {
        if key.hasPrefix(prefix) {
          result[String(key.dropFirst(prefix.count))] = value
        }
      }
      return result
    }

    Function("clearAll") { (suite: String?, targetName: String?) -> Void in
      let defaults = UserDefaults(suiteName: suite ?? "")
      guard let dict = defaults?.dictionaryRepresentation() else {
        return
      }
      if let targetName = targetName, !targetName.isEmpty {
        let prefix = "\(targetName):"
        for key in dict.keys where key.hasPrefix(prefix) {
          defaults?.removeObject(forKey: key)
        }
      } else {
        for key in dict.keys {
          defaults?.removeObject(forKey: key)
        }
      }
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

    Function("getTargetsConfig") { () -> [[String: Any]]? in
      // Read targets config from bundle's Info.plist
      guard let config = Bundle.main.object(forInfoDictionaryKey: "ExpoTargetsConfig") as? [[String: Any]] else {
        return nil
      }
      return config
    }
  }
}
