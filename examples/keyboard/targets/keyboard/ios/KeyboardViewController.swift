import UIKit

/// Custom keyboard with a tappable key for Devicewright typing proof.
@objc(KeyboardViewController)
class KeyboardViewController: UIInputViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .secondarySystemBackground

    let stack = UIStackView()
    stack.axis = .horizontal
    stack.spacing = 8
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)

    let key = UIButton(type: .system)
    key.setTitle("ET", for: .normal)
    key.titleLabel?.font = .systemFont(ofSize: 28, weight: .semibold)
    key.accessibilityIdentifier = "keyboard-key-et"
    key.accessibilityLabel = "ET"
    key.isAccessibilityElement = true
    key.backgroundColor = .systemBlue.withAlphaComponent(0.15)
    key.layer.cornerRadius = 10
    key.contentEdgeInsets = UIEdgeInsets(top: 20, left: 36, bottom: 20, right: 36)
    key.addTarget(self, action: #selector(insertEt), for: .touchUpInside)
    stack.addArrangedSubview(key)

    NSLayoutConstraint.activate([
      stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      key.widthAnchor.constraint(greaterThanOrEqualToConstant: 120),
      key.heightAnchor.constraint(greaterThanOrEqualToConstant: 64),
    ])
  }

  @objc private func insertEt() {
    textDocumentProxy.insertText("ET")
  }
}
