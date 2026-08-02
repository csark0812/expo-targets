import FileProvider
import UniformTypeIdentifiers

/// Minimal non-UI File Provider — empty root enumerator + domain-ready principal.
@objc(FileProviderExtension)
class FileProviderExtension: NSFileProviderExtension {
  override func item(for identifier: NSFileProviderItemIdentifier) throws
    -> NSFileProviderItem
  {
    FileProviderItem(identifier: identifier)
  }

  override func enumerator(
    for containerItemIdentifier: NSFileProviderItemIdentifier
  ) throws -> NSFileProviderEnumerator {
    FileProviderEnumerator(enumeratedItemIdentifier: containerItemIdentifier)
  }

  override func urlForItem(
    withPersistentIdentifier identifier: NSFileProviderItemIdentifier
  ) -> URL? {
    documentStorageURL
      .appendingPathComponent(identifier.rawValue, isDirectory: false)
  }

  override func persistentIdentifierForItem(at url: URL)
    -> NSFileProviderItemIdentifier?
  {
    NSFileProviderItemIdentifier(url.lastPathComponent)
  }

  override func providePlaceholder(
    at url: URL,
    completionHandler: @escaping (Error?) -> Void
  ) {
    do {
      let identifier =
        persistentIdentifierForItem(at: url)
        ?? NSFileProviderItemIdentifier(url.lastPathComponent)
      try NSFileProviderManager.writePlaceholder(
        at: url,
        withMetadata: FileProviderItem(identifier: identifier)
      )
      completionHandler(nil)
    } catch {
      completionHandler(error)
    }
  }

  override func startProvidingItem(
    at url: URL,
    completionHandler: @escaping ((Error?) -> Void)
  ) {
    completionHandler(nil)
  }

  override func itemChanged(at url: URL) {}

  override func stopProvidingItem(at url: URL) {
    try? FileManager.default.removeItem(at: url)
  }
}

final class FileProviderItem: NSObject, NSFileProviderItem {
  let itemIdentifier: NSFileProviderItemIdentifier
  let parentItemIdentifier: NSFileProviderItemIdentifier
  let filename: String
  let typeIdentifier: String
  let capabilities: NSFileProviderItemCapabilities

  init(identifier: NSFileProviderItemIdentifier) {
    itemIdentifier = identifier
    if identifier == .rootContainer {
      parentItemIdentifier = .rootContainer
      filename = "ET FileProv"
      typeIdentifier = UTType.folder.identifier
      capabilities = [.allowsReading, .allowsContentEnumerating]
    } else {
      parentItemIdentifier = .rootContainer
      filename = identifier.rawValue
      typeIdentifier = UTType.item.identifier
      capabilities = [.allowsReading]
    }
    super.init()
  }
}

final class FileProviderEnumerator: NSObject, NSFileProviderEnumerator {
  private let enumeratedItemIdentifier: NSFileProviderItemIdentifier

  init(enumeratedItemIdentifier: NSFileProviderItemIdentifier) {
    self.enumeratedItemIdentifier = enumeratedItemIdentifier
  }

  func invalidate() {}

  func enumerateItems(
    for observer: NSFileProviderEnumerationObserver,
    startingAt page: NSFileProviderPage
  ) {
    observer.didEnumerate([])
    observer.finishEnumerating(upTo: nil)
  }

  func enumerateChanges(
    for observer: NSFileProviderChangeObserver,
    from syncAnchor: NSFileProviderSyncAnchor
  ) {
    observer.finishEnumeratingChanges(upTo: syncAnchor, moreComing: false)
  }
}
