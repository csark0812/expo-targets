import CallKit
import Foundation

/// Call Directory extension — blocks demo numbers seeded by the host via App Group.
@objc(CallDirectoryHandler)
class CallDirectoryHandler: CXCallDirectoryProvider {
  private let appGroup = "group.com.expotargets.example.call-directory"
  private let blockedKey = "blockedNumbers"

  override func beginRequest(with context: CXCallDirectoryExtensionContext) {
    context.delegate = self

    let numbers = loadBlockedNumbers()
    for number in numbers.sorted() {
      context.addBlockingEntry(withNextSequentialPhoneNumber: number)
    }

    context.completeRequest()
  }

  private func loadBlockedNumbers() -> [CXCallDirectoryPhoneNumber] {
    if let stored = UserDefaults(suiteName: appGroup)?
      .array(forKey: blockedKey) as? [Int64],
      !stored.isEmpty
    {
      return stored.map { CXCallDirectoryPhoneNumber($0) }
    }
    // Journey default when host has not seeded yet.
    return [5555551234]
  }
}

extension CallDirectoryHandler: CXCallDirectoryExtensionContextDelegate {
  func requestFailed(
    for extensionContext: CXCallDirectoryExtensionContext,
    withError error: Error
  ) {
    extensionContext.cancelRequest(withError: error)
  }
}
