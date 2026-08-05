import ActivityKit
import ExpoModulesCore
import Foundation

#if canImport(Darwin)
import Darwin
#endif

public class ExpoTargetsLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoTargetsLiveActivity")

    AsyncFunction("start") {
      (attributesName: String, attributesJson: String, contentStateJson: String) -> String in
      guard #available(iOS 16.2, *) else {
        throw liveActivityError(16, "Live Activities require iOS 16.2+")
      }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        throw liveActivityError(1, "Live Activities disabled in Settings")
      }
      ensureGeneratedBridgeRegistered(attributesName)
      guard let handler = ExpoTargetsLiveActivityBridge.handler(for: attributesName) else {
        let names = ExpoTargetsLiveActivityBridge.registeredNames.joined(separator: ", ")
        throw liveActivityError(
          2,
          "No Live Activity bridge registered for \"\(attributesName)\". " +
            "Registered: \(names.isEmpty ? "(none — run prebuild so ExpoTargetsGenerated is emitted)" : names)"
        )
      }
      return try await handler.start(attributesJson, contentStateJson)
    }

    AsyncFunction("update") { (activityId: String, contentStateJson: String) -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      for handler in ExpoTargetsLiveActivityBridge.allHandlers() {
        if try await handler.update(activityId, contentStateJson) {
          return true
        }
      }
      return false
    }

    AsyncFunction("end") { (activityId: String) in
      guard #available(iOS 16.2, *) else { return }
      for handler in ExpoTargetsLiveActivityBridge.allHandlers() {
        try await handler.end(activityId)
      }
    }

    AsyncFunction("endAll") { () in
      guard #available(iOS 16.2, *) else { return }
      for handler in ExpoTargetsLiveActivityBridge.allHandlers() {
        try await handler.endAll()
      }
    }

    AsyncFunction("areActivitiesEnabled") { () -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }
  }
}

/**
 Force-load CNG bridge symbols that live in the *main app* executable.
 Called from this pod/framework — `dlsym(RTLD_DEFAULT)` does **not** search the
 main binary, so we `dlopen` `Bundle.main.executablePath` explicitly.
 */
private func ensureGeneratedBridgeRegistered(_ attributesName: String) {
  let className = "ExpoTargetsLABridge_\(attributesName)"
  let sel = NSSelectorFromString("ensureRegistered")
  let moduleName =
    (Bundle.main.infoDictionary?["CFBundleName"] as? String)
    ?? (Bundle.main.infoDictionary?["CFBundleExecutable"] as? String)
    ?? ""
  for name in [className, "\(moduleName).\(className)"] where !name.isEmpty {
    if let cls = NSClassFromString(name) as? NSObject.Type, cls.responds(to: sel) {
      cls.perform(sel)
      return
    }
  }

  let symbol = "expo_targets_la_bootstrap_\(attributesName)"
  typealias BootstrapFn = @convention(c) () -> Void
  if let exec = Bundle.main.executablePath {
    let handle =
      dlopen(exec, RTLD_LAZY | RTLD_NOLOAD) ?? dlopen(exec, RTLD_LAZY)
    if let handle, let sym = dlsym(handle, symbol) {
      unsafeBitCast(sym, to: BootstrapFn.self)()
      return
    }
  }
}

private func liveActivityError(_ code: Int, _ message: String) -> NSError {
  NSError(
    domain: "ExpoTargetsLiveActivity",
    code: code,
    userInfo: [NSLocalizedDescriptionKey: message]
  )
}
