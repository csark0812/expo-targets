import UIKit
import ExpoModulesCore
import React
import Expo
import ReactAppDependencyProvider

// Extension-compatible delegate using Expo's infrastructure
private class ExtensionReactDelegate: ExpoReactNativeFactoryDelegate {
    var dependencyProvider: any RCTDependencyProvider

    override init() {
        self.dependencyProvider = RCTAppDependencyProvider()
        super.init()
    }

    override func sourceURL(for bridge: RCTBridge) -> URL? {
        bundleURL()
    }

    override func bundleURL() -> URL? {
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

    override func newArchEnabled() -> Bool {
        #if RCT_NEW_ARCH_ENABLED
        return true
        #else
        return false
        #endif
    }
}

class ReactNativeViewController: UIViewController {
    private var reactNativeFactory: ExpoReactNativeFactory?
    private var rootView: UIView?

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
        // Use Expo's factory - gets new architecture automatically!
        let delegate = ExtensionReactDelegate()
        let factory = ExpoReactNativeFactory(delegate: delegate)
        self.reactNativeFactory = factory

        // Create root view using factory (supports both architectures)
        let rootView = factory.recreateRootView(
            withBundleURL: nil,  // Uses delegate's bundleURL
            moduleName: "{{MODULE_NAME}}",
            initialProps: getInitialProperties(),
            launchOptions: nil
        )

        rootView.backgroundColor = .clear
        rootView.frame = view.bounds
        rootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

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

