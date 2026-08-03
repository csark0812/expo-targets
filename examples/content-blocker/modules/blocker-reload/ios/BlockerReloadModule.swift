import SafariServices
import ExpoModulesCore

public class BlockerReloadModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BlockerReload")

    AsyncFunction("reload") { (identifier: String) -> String in
      try await withCheckedThrowingContinuation { (cont: CheckedContinuation<String, Error>) in
        SFContentBlockerManager.reloadContentBlocker(withIdentifier: identifier) { error in
          if let error {
            cont.resume(throwing: error)
          } else {
            cont.resume(returning: "reloaded")
          }
        }
      }
    }

    Function("ruleCount") { () -> Int in
      // Keep in sync with targets/content-blocker/ios/blockerList.json
      return 4
    }
  }
}
