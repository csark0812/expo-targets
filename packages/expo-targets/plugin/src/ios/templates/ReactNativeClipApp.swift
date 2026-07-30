import UIKit

/// Application entry point for React Native App Clips.
/// App Clips are applications (not NSExtensions), so they need `@main`
/// in addition to `ReactNativeViewController`.
@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = ReactNativeViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        NotificationCenter.default.post(
            name: Notification.Name("ExpoTargetsClipOpenURL"),
            object: nil,
            userInfo: ["url": url]
        )
        return true
    }

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        if let url = userActivity.webpageURL {
            NotificationCenter.default.post(
                name: Notification.Name("ExpoTargetsClipOpenURL"),
                object: nil,
                userInfo: ["url": url]
            )
        }
        return true
    }
}
