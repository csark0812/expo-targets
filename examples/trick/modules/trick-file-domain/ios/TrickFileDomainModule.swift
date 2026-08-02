import ExpoModulesCore
import FileProvider

public class TrickFileDomainModule: Module {
  private let domainId = "com.expotargets.example.trick.files"
  private let displayName = "ET Trick Files"

  public func definition() -> ModuleDefinition {
    Name("TrickFileDomain")

    AsyncFunction("register") { () -> String in
      guard #available(iOS 16.0, *) else {
        throw NSError(
          domain: "TrickFileDomain",
          code: 16,
          userInfo: [
            NSLocalizedDescriptionKey:
              "NSFileProviderDomain registration requires iOS 16+",
          ]
        )
      }
      let identifier = NSFileProviderDomainIdentifier(rawValue: self.domainId)
      let domain = NSFileProviderDomain(
        identifier: identifier,
        displayName: self.displayName
      )
      try await NSFileProviderManager.add(domain)
      return self.displayName
    }

    AsyncFunction("unregister") { () in
      guard #available(iOS 16.0, *) else { return }
      let identifier = NSFileProviderDomainIdentifier(rawValue: self.domainId)
      let domain = NSFileProviderDomain(
        identifier: identifier,
        displayName: self.displayName
      )
      try await NSFileProviderManager.remove(domain)
    }
  }
}
