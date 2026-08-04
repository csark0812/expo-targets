import QuickLook
import UIKit

/// Quick Look preview principal — proves Files → Quick Look opens our extension UI.
@objc(PreviewViewController)
class PreviewViewController: UIViewController, QLPreviewingController {
  private let markerLabel = UILabel()

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground

    markerLabel.text = "ET QL Preview"
    markerLabel.accessibilityIdentifier = "ql-preview-marker"
    markerLabel.accessibilityLabel = "ET QL Preview"
    markerLabel.textAlignment = .center
    markerLabel.font = .preferredFont(forTextStyle: .title2)
    markerLabel.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(markerLabel)

    NSLayoutConstraint.activate([
      markerLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      markerLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      markerLabel.leadingAnchor.constraint(
        greaterThanOrEqualTo: view.leadingAnchor,
        constant: 16
      ),
      markerLabel.trailingAnchor.constraint(
        lessThanOrEqualTo: view.trailingAnchor,
        constant: -16
      ),
    ])
  }

  func preparePreviewOfFile(
    at url: URL,
    completionHandler handler: @escaping (Error?) -> Void
  ) {
    let defaults = UserDefaults(suiteName: "group.com.expotargets.example.quicklook-preview")
    defaults?.set(url.lastPathComponent, forKey: "qlPreview:lastFile")
    defaults?.set("ET QL Preview", forKey: "qlPreview:marker")
    defaults?.set(Date().timeIntervalSince1970, forKey: "qlPreview:lastAt")
    defaults?.synchronize()
    handler(nil)
  }
}
