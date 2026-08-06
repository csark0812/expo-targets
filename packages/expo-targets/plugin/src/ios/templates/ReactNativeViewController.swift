import UIKit
import CryptoKit
internal import Expo
import React
import ReactAppDependencyProvider

// Extension-compatible delegate. SDK 55+ prebuilt React no longer exposes a
// standalone Swift module `React_RCTAppDelegate`; Expo's umbrella re-exports
// those types (same pattern as the host AppDelegate).
private class ExtensionReactDelegate: ExpoReactNativeFactoryDelegate {
    var bundleRoot: String

    init(bundleRoot: String) {
        self.bundleRoot = bundleRoot
        super.init()
    }

    override func sourceURL(for bridge: RCTBridge) -> URL? {
        bundleURL()
    }

    private func embeddedBundleURL() -> URL? {
        if let main = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
            return main
        }
        return Bundle.main.url(forResource: "index", withExtension: "jsbundle")
    }

    private func sha256Hex(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    /// Release-only: load a host-installed App Group sideload when valid.
    private func appGroupBundleURL() -> URL? {
        let appGroup = "{{APP_GROUP}}"
        let targetName = "{{TARGET_NAME}}"
        let bakedRuntimeVersion = "{{RUNTIME_VERSION}}"
        let maxBytes = {{MAX_BUNDLE_BYTES}}
        guard !appGroup.isEmpty,
              !bakedRuntimeVersion.isEmpty,
              let container = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: appGroup
              ) else {
            return nil
        }
        let dir = container
            .appendingPathComponent("expo-targets", isDirectory: true)
            .appendingPathComponent("bundles", isDirectory: true)
            .appendingPathComponent(targetName, isDirectory: true)
        let bundleURL = dir.appendingPathComponent("main.jsbundle")
        let manifestURL = dir.appendingPathComponent("manifest.json")
        guard FileManager.default.fileExists(atPath: bundleURL.path),
              let manifestData = try? Data(contentsOf: manifestURL),
              let json = try? JSONSerialization.jsonObject(with: manifestData) as? [String: Any],
              let runtimeVersion = json["runtimeVersion"] as? String,
              runtimeVersion == bakedRuntimeVersion,
              let byteLength = json["byteLength"] as? Int,
              byteLength <= maxBytes,
              let expectedSha = json["sha256"] as? String,
              let fileData = try? Data(contentsOf: bundleURL),
              sha256Hex(fileData) == expectedSha else {
            // Leave invalid files on disk for diagnostics (Decision 11).
            return nil
        }
        return bundleURL
    }

    private func appendTargetQuery(to bundleURL: URL) -> URL {
        guard var components = URLComponents(url: bundleURL, resolvingAgainstBaseURL: false) else {
            return bundleURL
        }
        var items = components.queryItems ?? []
        if !items.contains(where: { $0.name == "target" }) {
            items.append(URLQueryItem(name: "target", value: "{{TARGET_NAME}}"))
            components.queryItems = items
        }
        return components.url ?? bundleURL
    }

    #if DEBUG
    private func configureDebugPackagerSettings(_ settings: RCTBundleURLProvider) {
        settings.enableDev = true
        settings.enableMinification = false

        // Extensions lack the host app's ip.txt; Simulator defaults to localhost.
        #if targetEnvironment(simulator)
        if settings.jsLocation == nil || settings.jsLocation?.isEmpty == true {
            settings.jsLocation = "localhost"
        }
        #endif
    }

    private func debugBundleURL() -> URL? {
        let settings = RCTBundleURLProvider.sharedSettings()
        configureDebugPackagerSettings(settings)

        // RCTBundleURLProvider checks packager reachability and may fall back to main.jsbundle.
        guard let url = settings.jsBundleURL(forBundleRoot: bundleRoot) else {
            return embeddedBundleURL()
        }

        if url.isFileURL {
            return embeddedBundleURL() ?? url
        }

        return appendTargetQuery(to: url)
    }
    #endif

    override func bundleURL() -> URL? {
        #if DEBUG
        // Metro → embedded; App Group not consulted in DEBUG.
        return debugBundleURL()
        #else
        return appGroupBundleURL() ?? embeddedBundleURL()
        #endif
    }
}

class ReactNativeViewController: UIViewController {
    private var reactNativeFactory: ExpoReactNativeFactory?
    private var reactNativeFactoryDelegate: ExpoReactNativeFactoryDelegate?
    private var rootView: UIView?
    private var isCleanedUp = false
    private var initialExtensionData: [String: Any]?

    // MARK: - Extension Data

    {{EXTENSION_DATA_PROPERTIES}}

    // MARK: - Lifecycle

    // For messages extensions: accept data from parent MessagesViewController
    convenience init(messagesData: [String: Any]) {
        self.init(nibName: nil, bundle: nil)
        self.initialExtensionData = messagesData
    }

    deinit {
        cleanupAfterClose()
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // Set the contentScaleFactor for proper rendering
        self.view.contentScaleFactor = UIScreen.main.scale
        isCleanedUp = false

        setupNotificationObservers()

        // If data was passed from parent (messages), use it directly
        if let extensionData = self.initialExtensionData {
            setupReactNativeView(with: extensionData)
        } else {
            // Otherwise load it ourselves (share, action, etc.)
            {{LOAD_EXTENSION_DATA}}
        }
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesBegan(touches, with: event)
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
        let delegate = ExtensionReactDelegate(bundleRoot: "{{BUNDLE_ROOT}}")
        guard delegate.bundleURL() != nil else {
            showError(
                "Could not load the JavaScript bundle. Start Metro with `npx expo start` for live reload, or rebuild with an embedded bundle (Release / no packager)."
            )
            return
        }

        reactNativeFactoryDelegate = delegate
        reactNativeFactoryDelegate!.dependencyProvider = RCTAppDependencyProvider()

        // Create factory via Expo (pulls RCTAppDelegate APIs through Expo.h)
        reactNativeFactory = ExpoReactNativeFactory(delegate: reactNativeFactoryDelegate!)

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

        // Explicitly enable user interaction
        rootView.isUserInteractionEnabled = true
        self.view.isUserInteractionEnabled = true

        view.addSubview(rootView)
        self.rootView = rootView
    }

    private func cleanupAfterClose() {
        if isCleanedUp { return }
        isCleanedUp = true

        NotificationCenter.default.removeObserver(self)

        // Drop the RN root without referencing deprecated RCTRootView.
        rootView?.removeFromSuperview()
        rootView = nil

        reactNativeFactory = nil
        reactNativeFactoryDelegate = nil
    }

    // MARK: - Notification Handling

    private func setupNotificationObservers() {
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("ExpoTargetsCloseExtension"),
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.closeExtension()
        }

        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("ExpoTargetsOpenHostApp"),
            object: nil,
            queue: .main
        ) { [weak self] notification in
            if let userInfo = notification.userInfo,
               let path = userInfo["path"] as? String {
                self?.openHostApp(path: path)
            }
        }
    }

    private func closeExtension() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        cleanupAfterClose()
    }

    private func openHostApp(path: String) {
        guard let bundleIdentifier = Bundle.main.bundleIdentifier else { return }
        // Remove common extension suffixes to get host app bundle ID
        let extensionSuffixes = [".ShareExtension", ".share", ".action", ".clip"]
        var appBundleId = bundleIdentifier

        for suffix in extensionSuffixes {
            appBundleId = appBundleId.replacingOccurrences(of: suffix, with: "")
        }

        guard let url = URL(string: "\(appBundleId)://\(path)") else { return }

        // Use extensionContext.open() which is the proper way to open URLs in extensions
        if let context = extensionContext {
            context.open(url, completionHandler: { success in
                if success {
                    // Close extension after opening host app
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                        self?.closeExtension()
                    }
                }
            })
        } else {
            // Fallback: try responder chain (shouldn't normally be needed)
            var responder: UIResponder? = self
            while responder != nil {
                if let application = responder as? UIApplication {
                    application.open(url, options: [:], completionHandler: nil)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                        self?.closeExtension()
                    }
                    return
                }
                responder = responder?.next
            }
        }
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

