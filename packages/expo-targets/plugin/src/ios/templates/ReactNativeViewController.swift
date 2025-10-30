import UIKit
import ExpoModulesCore

class ReactNativeViewController: UIViewController {
    private var appBridge: RCTBridge?
    private var factory: ExpoReactNativeFactory?

    // MARK: - Extension Data

    {{EXTENSION_DATA_PROPERTIES}}

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()

        {{LOAD_EXTENSION_DATA}}

        setupReactNativeView()
    }

    // MARK: - React Native Setup

    private func setupReactNativeView() {
        // Initialize Expo React Native factory
        factory = ExpoReactNativeFactory()

        // Create bridge with entry point
        guard let bridge = factory?.createBridge(
            moduleName: "{{MODULE_NAME}}",
            initialProperties: getInitialProperties(),
            launchOptions: nil
        ) else {
            showError("Failed to initialize React Native")
            return
        }

        self.appBridge = bridge

        // Create root view
        let rootView = RCTRootView(
            bridge: bridge,
            moduleName: "{{MODULE_NAME}}",
            initialProperties: getInitialProperties()
        )

        rootView.backgroundColor = .clear
        rootView.frame = view.bounds
        rootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        view.addSubview(rootView)
    }

    private func getInitialProperties() -> [String: Any] {
        var props: [String: Any] = [:]

        {{INITIAL_PROPERTIES}}

        return props
    }

    // MARK: - Error Handling

    private func showError(_ message: String) {
        let alert = UIAlertController(
            title: "Error",
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            self.extensionContext?.completeRequest(returningItems: nil)
        })
        present(alert, animated: true)
    }
}

