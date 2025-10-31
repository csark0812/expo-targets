import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

// Extension-compatible delegate using standard RCT pattern
private class ExtensionReactDelegate: RCTDefaultReactNativeFactoryDelegate {
    var bundleRoot: String

    init(bundleRoot: String) {
        self.bundleRoot = bundleRoot
        super.init()
    }

    override func sourceURL(for bridge: RCTBridge) -> URL? {
        bundleURL()
    }

    override func bundleURL() -> URL? {
        #if DEBUG
        let settings = RCTBundleURLProvider.sharedSettings()
        settings.enableDev = true
        settings.enableMinification = false

        // Use target-specific bundle root with query parameter
        if let bundleURL = settings.jsBundleURL(forBundleRoot: bundleRoot) {
            if var components = URLComponents(url: bundleURL, resolvingAgainstBaseURL: false) {
                components.queryItems = (components.queryItems ?? []) + [
                    URLQueryItem(name: "target", value: "{{TARGET_NAME}}")
                ]
                return components.url ?? bundleURL
            }
            return bundleURL
        }
        return nil
        #else
        // In release, load from main bundle
        guard let bundleURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle") else {
            return Bundle.main.url(forResource: "index", withExtension: "jsbundle")
        }
        return bundleURL
        #endif
    }
}

class ReactNativeViewController: UIViewController {
    private var reactNativeFactory: RCTReactNativeFactory?
    private var reactNativeFactoryDelegate: RCTReactNativeFactoryDelegate?
    private var rootView: UIView?
    private var isCleanedUp = false

    // MARK: - Extension Data

    {{EXTENSION_DATA_PROPERTIES}}

    // MARK: - Lifecycle

    deinit {
        print("🧹 ReactNativeViewController deinit for {{TARGET_NAME}}")
        cleanupAfterClose()
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // Set the contentScaleFactor for proper rendering
        self.view.contentScaleFactor = UIScreen.main.scale
        isCleanedUp = false

        {{LOAD_EXTENSION_DATA}}
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if isBeingDismissed {
            cleanupAfterClose()
        }
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        cleanupAfterClose()
    }

    // MARK: - React Native Setup

    private func setupReactNativeView(with sharedData: [String: Any]?) {
        // Create delegate with target-specific bundle root
        reactNativeFactoryDelegate = ExtensionReactDelegate(bundleRoot: "{{BUNDLE_ROOT}}")
        reactNativeFactoryDelegate!.dependencyProvider = RCTAppDependencyProvider()

        // Create factory using standard RCT pattern
        reactNativeFactory = RCTReactNativeFactory(delegate: reactNativeFactoryDelegate!)

        // Capture current view properties
        let currentBounds = self.view.bounds
        let currentScale = UIScreen.main.scale

        var initialProps = sharedData ?? [:]

        // Add screen metrics for React Native
        initialProps["initialViewWidth"] = currentBounds.width
        initialProps["initialViewHeight"] = currentBounds.height
        initialProps["pixelRatio"] = currentScale
        initialProps["fontScale"] = UIFont.preferredFont(forTextStyle: .body).pointSize / 17.0

        // Create root view using factory
        let rootView = reactNativeFactory!.rootViewFactory.view(
            withModuleName: "{{MODULE_NAME}}",
            initialProperties: initialProps
        )

        rootView.backgroundColor = .clear
        rootView.frame = view.bounds
        rootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        view.addSubview(rootView)
        self.rootView = rootView
    }

    private func cleanupAfterClose() {
        if isCleanedUp { return }
        isCleanedUp = true

        // Remove React Native view and deallocate resources
        view.subviews.forEach { subview in
            if subview is RCTRootView {
                subview.removeFromSuperview()
            }
        }

        reactNativeFactory = nil
        reactNativeFactoryDelegate = nil

        print("🧹 ReactNativeViewController cleaned up for {{TARGET_NAME}}")
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

