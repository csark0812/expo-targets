import CoreSpotlight
import Foundation
import UniformTypeIdentifiers

/// Spotlight import principal — attributes files of our custom UTI for search.
@objc(ImportExtension)
final class ImportExtension: CSImportExtension {
  override func update(
    _ attributes: CSSearchableItemAttributeSet,
    forFileAt contentURL: URL
  ) throws {
    let name = contentURL.deletingPathExtension().lastPathComponent
    attributes.displayName = "ET Spotlight Import"
    attributes.title = "ET Spotlight Import"
    attributes.contentDescription = "expo-targets spotlight importer: \(name)"
    attributes.keywords = ["expo-targets", "ET Spotlight", name]

    let defaults = UserDefaults(suiteName: "group.com.expotargets.example.spotlight")
    defaults?.set(contentURL.lastPathComponent, forKey: "spotlight:lastFile")
    defaults?.set("ET Spotlight Import", forKey: "spotlight:marker")
    defaults?.set(Date().timeIntervalSince1970, forKey: "spotlight:lastAt")
    defaults?.synchronize()
  }
}
