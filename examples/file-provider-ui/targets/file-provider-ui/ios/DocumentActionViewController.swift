import FileProviderUI
import UIKit

/// Minimal File Provider UI action extension — real FPUIActionExtensionViewController.
@objc(DocumentActionViewController)
class DocumentActionViewController: FPUIActionExtensionViewController {
  override func prepare(forAction actionIdentifier: String, itemIdentifiers: [NSFileProviderItemIdentifier]) {
    let label = UILabel()
    label.text = "ET FileProvUI"
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    label.accessibilityIdentifier = "file-provider-ui-marker"
    view.backgroundColor = .systemBackground
    view.addSubview(label)
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])
  }

  override func prepare(forError error: Error) {
    prepare(forAction: "error", itemIdentifiers: [])
  }
}
