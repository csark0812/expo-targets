import ExpoModulesCore
import SafariServices

public class ExpoTargetsContentBlockerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoTargetsContentBlocker")

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
  }
}
