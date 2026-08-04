import IdentityLookup
import IdentityLookupUI
import UIKit

/// Unwanted Communication Reporting principal — Settings Phone → SMS/Call Reporting.
@objc(ClassificationViewController)
class ClassificationViewController: ILClassificationUIExtensionViewController {
  private let markerLabel = UILabel()
  private let appGroup = "group.com.expotargets.example.unwanted-communication"

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground

    markerLabel.text = "ET Unwanted"
    markerLabel.accessibilityIdentifier = "uc-classification-marker"
    markerLabel.accessibilityLabel = "ET Unwanted"
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

  override func prepare(for request: ILClassificationRequest) {
    let defaults = UserDefaults(suiteName: appGroup)
    defaults?.set("ET Unwanted", forKey: "uc:marker")
    defaults?.set(String(describing: type(of: request)), forKey: "uc:lastRequest")
    defaults?.set(Date().timeIntervalSince1970, forKey: "uc:lastAt")
    defaults?.synchronize()
    extensionContext.isReadyForClassificationResponse = true
  }

  override func classificationResponse(
    for request: ILClassificationRequest
  ) -> ILClassificationResponse {
    ILClassificationResponse(action: .reportJunk)
  }
}
