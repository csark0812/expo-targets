import UIKit
import ExpoModulesCore
import React

// Bridge delegate for app extensions (cannot use UIApplication.shared)
private class ExtensionBridgeDelegate: NSObject, RCTBridgeDelegate {
    func sourceURL(for bridge: RCTBridge) -> URL? {
        #if DEBUG
        // Use RCTBundleURLProvider to dynamically detect Metro port
        // Reads from RCT_METRO_PORT env var or defaults to 8081
        // Uses same bundle root as main app for Expo compatibility
        return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
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

