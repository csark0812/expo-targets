import ExpoModulesCore
import FileProvider

public class ExpoTargetsFileProviderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoTargetsFileProvider")

    AsyncFunction("register") { (identifier: String, displayName: String) -> String in
      guard #available(iOS 16.0, *) else {
        throw NSError(
          domain: "ExpoTargetsFileProvider",
          code: 16,
          userInfo: [
            NSLocalizedDescriptionKey:
              "NSFileProviderDomain registration requires iOS 16+",
          ]
        )
      }
      let domainIdentifier = NSFileProviderDomainIdentifier(rawValue: identifier)
      // ReplicatedExtension requires the 2-arg initializer. Using
      // pathRelativeToDocumentStorage forces legacy NSFileProviderExtension
      // bring-up and aborts (__FILEPROVIDER_V2_EXTENSION_WITHOUT_IMPL).
      let domain = NSFileProviderDomain(
        identifier: domainIdentifier,
        displayName: displayName
      )
      try await NSFileProviderManager.add(domain)
      if let manager = NSFileProviderManager(for: domain) {
        try? await manager.signalEnumerator(for: .workingSet)
        try? await manager.signalEnumerator(for: .rootContainer)
      }
      return displayName
    }

    AsyncFunction("unregister") { (identifier: String, displayName: String) in
      guard #available(iOS 16.0, *) else { return }
      let domainIdentifier = NSFileProviderDomainIdentifier(rawValue: identifier)
      let domain = NSFileProviderDomain(
        identifier: domainIdentifier,
        displayName: displayName
      )
      try await NSFileProviderManager.remove(domain)
    }
  }
}
