import ManagedSettingsUI
import UIKit

/// Shield action extension — responds to shield button taps.
@objc(ShieldActionExtension)
class ShieldActionExtension: ShieldActionDelegate {
  func handle(
    action: ShieldAction,
    for application: ApplicationToken,
    completionHandler: @escaping (ShieldActionResponse) -> Void
  ) {
    completionHandler(.close)
  }
}
