import ManagedSettings
import ManagedSettingsUI
import UIKit

/// Shield configuration extension — supplies shield UI metadata.
@objc(ShieldConfigurationExtension)
class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  override func configuration(shielding application: Application) -> ShieldConfiguration {
    ShieldConfiguration()
  }
}
