import XCTest

/// Share Sheet smoke for expo-targets examples (Release simulator).
///
/// Attached via `scripts/attach-after-prebuild.sh` into a generated `ios/` project.
/// Bundle IDs are overridden per host with `UITEST_HOST_BUNDLE_ID` / `UITEST_EXTENSION_NAME`.
final class ShareSheetSmoke: XCTestCase {
  private var hostBundleId: String {
    ProcessInfo.processInfo.environment["UITEST_HOST_BUNDLE_ID"]
      ?? "com.expotargets.example.share"
  }

  private var extensionName: String {
    ProcessInfo.processInfo.environment["UITEST_EXTENSION_NAME"]
      ?? "Example Share"
  }

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testHostLaunchesAndShowsRoot() throws {
    let app = XCUIApplication(bundleIdentifier: hostBundleId)
    app.launchArguments = ["--uitest-share-sheet"]
    app.launch()
    XCTAssertTrue(
      app.otherElements["screen-root"].waitForExistence(timeout: 20),
      "Host screen-root missing for \(hostBundleId)"
    )
  }

  /// Best-effort Share Sheet path. Flaky across iOS versions — pin sim OS in runbook.
  func testShareSheetPicksExtension() throws {
    let app = XCUIApplication(bundleIdentifier: hostBundleId)
    app.launch()
    XCTAssertTrue(app.otherElements["screen-root"].waitForExistence(timeout: 20))

    // Seed App Group from host so post-share asserts have a baseline.
    let seed = app.buttons["btn-seed-payload"]
    if seed.waitForExistence(timeout: 5) {
      seed.tap()
    }

    // Photos is the usual share source on Simulator. If Photos is unavailable,
    // fail loud — do not silently skip (C1 failure gate).
    let photos = XCUIApplication(bundleIdentifier: "com.apple.mobileslideshow")
    photos.launch()
    XCTAssertTrue(photos.wait(for: .runningForeground, timeout: 15))

    // Select first asset if present, then open Share.
    let firstCell = photos.cells.firstMatch
    XCTAssertTrue(firstCell.waitForExistence(timeout: 15), "No Photos assets on simulator")
    firstCell.tap()

    let shareButton = photos.buttons["Share"]
    XCTAssertTrue(shareButton.waitForExistence(timeout: 10), "Share button missing in Photos")
    shareButton.tap()

    let extensionCell = photos.cells.staticTexts[extensionName]
    XCTAssertTrue(
      extensionCell.waitForExistence(timeout: 15),
      "Extension \(extensionName) not in Share Sheet — check Release install + activation rules"
    )
    extensionCell.tap()

    // Return to host and assert payload surface still responds.
    app.activate()
    XCTAssertTrue(app.otherElements["text-last-payload"].waitForExistence(timeout: 20))
  }
}
