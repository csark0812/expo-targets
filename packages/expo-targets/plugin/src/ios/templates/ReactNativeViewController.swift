import UIKit
import ExpoModulesCore
import React

// Bridge delegate for app extensions (cannot use UIApplication.shared)
private class ExtensionBridgeDelegate: NSObject, RCTBridgeDelegate {
    func sourceURL(for bridge: RCTBridge) -> URL? {
        #if DEBUG
        // Use RCTBundleURLProvider to dynamically detect Metro port
        // Reads from RCT_METRO_PORT env var or defaults to 8081
        // Uses target-specific bundle root
        return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "{{BUNDLE_ROOT}}")
        #else
        // In release, load from main bundle
        guard let bundleURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle") else {
            // Fallback: try to construct path to bundle
            return Bundle.main.url(forResource: "index", withExtension: "jsbundle")
        }
        return bundleURL
        #endif
    }
}

class ReactNativeViewController: UIViewController {
    private var appBridge: RCTBridge?
    private var bridgeDelegate: ExtensionBridgeDelegate?
    private var rootView: RCTRootView?

    // MARK: - Extension Data

    {{EXTENSION_DATA_PROPERTIES}}

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()

        // Setup React Native immediately (don't wait for content)
        setupReactNativeView()

        {{LOAD_EXTENSION_DATA}}
    }

    // MARK: - React Native Setup

    private func setupReactNativeView() {
        // Create bridge delegate for extensions (avoids UIApplication.shared)
        bridgeDelegate = ExtensionBridgeDelegate()

        // Create bridge directly (extensions cannot use ExpoReactDelegate)
        guard let delegate = bridgeDelegate else {
            showError("Failed to create bridge delegate")
            return
        }

        guard let bridge = RCTBridge(delegate: delegate, launchOptions: nil) else {
            showError("Failed to create React Native bridge")
            return
        }
        self.appBridge = bridge

        // Create root view
        let rootView = RCTRootView(
            bridge: bridge,
            moduleName: "{{MODULE_NAME}}",
            initialProperties: getInitialProperties()
        )

        rootView.backgroundColor = UIColor.clear
        rootView.frame = view.bounds
        rootView.autoresizingMask = [UIView.AutoresizingMask.flexibleWidth, UIView.AutoresizingMask.flexibleHeight]

        view.addSubview(rootView)
        self.rootView = rootView
    }

    private func updateReactNativeView() {
        guard let rootView = self.rootView else { return }

        // Update root view with new properties containing loaded content
        rootView.appProperties = getInitialProperties()
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

