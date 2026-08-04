import FileProvider
import Foundation
import UniformTypeIdentifiers

private let appGroupId = "group.com.expotargets.example.file-provider"
private let seedIdentifier = NSFileProviderItemIdentifier(
  "NDQ0NDQ0NDQtNDQ0NC00NDQ0LTQ0NDQtNDQ0NDQ0NDQ0NDQ0"
)
private let seedFilename = "et-fp-seed.txt"
private let seedBody = Data("expo-targets file-provider seed\nET FileProv\n".utf8)

/// Modern File Provider principal (Replicated + Enumerating) — required on iOS 16+.
/// Do not `@objc`-rename: Info.plist uses `$(PRODUCT_MODULE_NAME).FileProviderExtension`.
final class FileProviderExtension: NSObject, NSFileProviderReplicatedExtension,
  NSFileProviderEnumerating
{
  private let domain: NSFileProviderDomain

  required init(domain: NSFileProviderDomain) {
    self.domain = domain
    super.init()
  }

  func invalidate() {}

  func item(
    for identifier: NSFileProviderItemIdentifier,
    request: NSFileProviderRequest,
    completionHandler: @escaping (NSFileProviderItem?, Error?) -> Void
  ) -> Progress {
    let progress = Progress(totalUnitCount: 1)
    completionHandler(FileProviderItem(identifier: identifier), nil)
    progress.completedUnitCount = 1
    return progress
  }

  func fetchContents(
    for itemIdentifier: NSFileProviderItemIdentifier,
    version requestedVersion: NSFileProviderItemVersion?,
    request: NSFileProviderRequest,
    completionHandler: @escaping (URL?, NSFileProviderItem?, Error?) -> Void
  ) -> Progress {
    let progress = Progress(totalUnitCount: 1)
    let item = FileProviderItem(identifier: itemIdentifier)
    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent(item.filename)
    do {
      try seedBody.write(to: url, options: .atomic)
      Self.writeAppGroupMarker()
      completionHandler(url, item, nil)
    } catch {
      completionHandler(nil, nil, error)
    }
    progress.completedUnitCount = 1
    return progress
  }

  func createItem(
    basedOn itemTemplate: NSFileProviderItem,
    fields: NSFileProviderItemFields,
    contents url: URL?,
    options: NSFileProviderCreateItemOptions = [],
    request: NSFileProviderRequest,
    completionHandler: @escaping (NSFileProviderItem?, NSFileProviderItemFields, Bool, Error?) ->
      Void
  ) -> Progress {
    // Disk-import / remote create: echo a valid versioned item (do not
    // return unsupported — that aborts Replicated bring-up of root).
    let progress = Progress(totalUnitCount: 1)
    let created = FileProviderItem(identifier: itemTemplate.itemIdentifier)
    completionHandler(created, [], false, nil)
    progress.completedUnitCount = 1
    return progress
  }

  func modifyItem(
    _ item: NSFileProviderItem,
    baseVersion version: NSFileProviderItemVersion,
    changedFields: NSFileProviderItemFields,
    contents newContents: URL?,
    options: NSFileProviderModifyItemOptions = [],
    request: NSFileProviderRequest,
    completionHandler: @escaping (NSFileProviderItem?, NSFileProviderItemFields, Bool, Error?) ->
      Void
  ) -> Progress {
    let progress = Progress(totalUnitCount: 1)
    completionHandler(FileProviderItem(identifier: item.itemIdentifier), [], false, nil)
    progress.completedUnitCount = 1
    return progress
  }

  func deleteItem(
    identifier: NSFileProviderItemIdentifier,
    baseVersion version: NSFileProviderItemVersion,
    options: NSFileProviderDeleteItemOptions = [],
    request: NSFileProviderRequest,
    completionHandler: @escaping (Error?) -> Void
  ) -> Progress {
    let progress = Progress(totalUnitCount: 1)
    completionHandler(nil)
    progress.completedUnitCount = 1
    return progress
  }

  func enumerator(
    for containerItemIdentifier: NSFileProviderItemIdentifier,
    request: NSFileProviderRequest
  ) throws -> NSFileProviderEnumerator {
    FileProviderEnumerator(enumeratedItemIdentifier: containerItemIdentifier)
  }

  private static func writeAppGroupMarker() {
    let defaults = UserDefaults(suiteName: appGroupId)
    defaults?.set("ET FileProv", forKey: "fp:marker")
    defaults?.set(seedFilename, forKey: "fp:lastFile")
    defaults?.set(Date().timeIntervalSince1970, forKey: "fp:lastAt")
    defaults?.synchronize()
  }
}

final class FileProviderItem: NSObject, NSFileProviderItem {
  let itemIdentifier: NSFileProviderItemIdentifier
  let parentItemIdentifier: NSFileProviderItemIdentifier
  let filename: String
  let capabilities: NSFileProviderItemCapabilities
  let documentSize: NSNumber?
  let creationDate: Date?
  let contentModificationDate: Date?
  let itemVersion: NSFileProviderItemVersion
  let contentType: UTType
  let isDownloaded: Bool
  let isDownloading: Bool
  let isUploaded: Bool
  let isUploading: Bool

  init(identifier: NSFileProviderItemIdentifier) {
    itemIdentifier = identifier
    let now = Date()
    creationDate = now
    contentModificationDate = now
    // Replicated API requires itemVersion on every item
    // (__FILEPROVIDER_BAD_ITEM_MISSING_ITEMVERSION__).
    itemVersion = NSFileProviderItemVersion(
      contentVersion: Data("c1".utf8),
      metadataVersion: Data("m1".utf8)
    )
    isDownloaded = true
    isDownloading = false
    isUploaded = true
    isUploading = false
    if identifier == .rootContainer || identifier == .workingSet {
      parentItemIdentifier = .rootContainer
      filename = identifier == .workingSet ? "Working Set" : "ET FileProv"
      contentType = .folder
      capabilities = [.allowsReading, .allowsContentEnumerating]
      documentSize = nil
    } else if identifier == seedIdentifier {
      parentItemIdentifier = .rootContainer
      filename = seedFilename
      contentType = .plainText
      capabilities = [.allowsReading]
      documentSize = NSNumber(value: seedBody.count)
    } else {
      parentItemIdentifier = .rootContainer
      filename = identifier.rawValue.isEmpty ? "item" : identifier.rawValue
      contentType = .folder
      capabilities = [.allowsReading, .allowsContentEnumerating]
      documentSize = nil
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
    if enumeratedItemIdentifier == .rootContainer
      || enumeratedItemIdentifier == .workingSet
    {
      let defaults = UserDefaults(suiteName: appGroupId)
      defaults?.set("ET FileProv", forKey: "fp:marker")
      defaults?.set(seedFilename, forKey: "fp:lastFile")
      defaults?.set(Date().timeIntervalSince1970, forKey: "fp:lastAt")
      defaults?.synchronize()
      observer.didEnumerate([FileProviderItem(identifier: seedIdentifier)])
    } else {
      observer.didEnumerate([])
    }
    observer.finishEnumerating(upTo: nil)
  }

  func enumerateChanges(
    for observer: NSFileProviderChangeObserver,
    from syncAnchor: NSFileProviderSyncAnchor
  ) {
    observer.finishEnumeratingChanges(upTo: syncAnchor, moreComing: false)
  }

  func currentSyncAnchor(
    completionHandler: @escaping (NSFileProviderSyncAnchor?) -> Void
  ) {
    completionHandler(NSFileProviderSyncAnchor(Data([0])))
  }
}
