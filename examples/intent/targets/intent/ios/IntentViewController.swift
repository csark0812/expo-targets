import IntentsUI
import UIKit

/// Intent UI companion — presents a minimal hosted view for journey proof.
@objc(IntentViewController)
class IntentViewController: UIViewController, INUIHostedViewControlling {
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    let label = UILabel()
    label.text = "ET Intent UI"
    label.textAlignment = .center
    label.accessibilityIdentifier = "intent-ui-marker"
    label.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(label)
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])
  }

  func configureView(
    for parameters: Set<INParameter>,
    of interaction: INInteraction,
    interactiveBehavior: INUIInteractiveBehavior,
    context: INUIHostedViewContext,
    completion: @escaping (Bool, Set<INParameter>, CGSize) -> Void
  ) {
    completion(true, parameters, desiredSize)
  }

  var desiredSize: CGSize {
    CGSize(width: 320, height: 120)
  }
}
