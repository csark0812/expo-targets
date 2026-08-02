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
    key.accessibilityIdentifier = "keyboard-key-et"
    key.addTarget(self, action: #selector(insertEt), for: .touchUpInside)
    stack.addArrangedSubview(key)

    NSLayoutConstraint.activate([
      stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])
  }

  @objc private func insertEt() {
    textDocumentProxy.insertText("ET")
  }
}
