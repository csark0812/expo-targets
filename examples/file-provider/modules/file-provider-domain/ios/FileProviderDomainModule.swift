import ExpoModulesCore
import FileProvider

public class FileProviderDomainModule: Module {
  private let domainId = "com.expotargets.example.file-provider.file-provider"
  private let displayName = "ET FileProv"

  public func definition() -> ModuleDefinition {
    Name("FileProviderDomain")

    AsyncFunction("register") { () -> String in
      guard #available(iOS 16.0, *) else {
        throw NSError(
          domain: "FileProviderDomain",
          code: 16,
          userInfo: [
            NSLocalizedDescriptionKey:
              "NSFileProviderDomain registration requires iOS 16+",
          ]
        )
      }
      let identifier = NSFileProviderDomainIdentifier(rawValue: self.domainId)
      // ReplicatedExtension requires the 2-arg initializer. Using
      // pathRelativeToDocumentStorage forces legacy NSFileProviderExtension
      // bring-up and aborts (__FILEPROVIDER_V2_EXTENSION_WITHOUT_IMPL).
      let domain = NSFileProviderDomain(
        identifier: identifier,
        displayName: self.displayName
      )
      try await NSFileProviderManager.add(domain)
      if let manager = NSFileProviderManager(for: domain) {
        try? await manager.signalEnumerator(for: .workingSet)
        try? await manager.signalEnumerator(for: .rootContainer)
      }
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
