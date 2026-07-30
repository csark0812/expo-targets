import XCTest

/// Share Sheet smoke for expo-targets examples (Release simulator).
///
/// Attached via `scripts/attach-after-prebuild.sh` into a generated `ios/` project.
/// Bundle IDs / row titles via `UITEST_*` scheme env (see attach script).
///
/// C1 gate: host opens a real system Share Sheet and the sheet is interactable
/// (extension row visible + hittable, sheet dismisses). Does **not** require the
/// appex process to launch or complete — that is a separate runtime bug if broken.
final class ShareSheetSmoke: XCTestCase {
  private var hostBundleId: String {
    ProcessInfo.processInfo.environment["UITEST_HOST_BUNDLE_ID"]
      ?? "com.expotargets.example.share"
  }

  private var extensionName: String {
    ProcessInfo.processInfo.environment["UITEST_EXTENSION_NAME"]
      ?? "ET Share"
  }

  private var extensionBundleId: String {
    ProcessInfo.processInfo.environment["UITEST_EXTENSION_BUNDLE_ID"]
      ?? "com.expotargets.example.share.share"
  }

  /// Alternate Share Sheet row titles seen across iOS / containing-app naming.
  private var extensionNameCandidates: [String] {
    let primary = extensionName
    var names = [primary]
    if let hostName = ProcessInfo.processInfo.environment["UITEST_HOST_DISPLAY_NAME"], !hostName.isEmpty {
      names.append(hostName)
    }
    names.append(contentsOf: ["Example Share", "ExampleShareTarget", "Share"])
    var seen = Set<String>()
    return names.filter { seen.insert($0).inserted }
  }

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testHostLaunchesAndShowsRoot() throws {
    let app = XCUIApplication(bundleIdentifier: hostBundleId)
    app.launchArguments = ["--uitest-share-sheet"]
    app.launch()
    XCTAssertTrue(
      element(in: app, id: "screen-root").waitForExistence(timeout: 20),
      "Host screen-root missing for \(hostBundleId)"
    )
  }

  /// Opens the system Share Sheet and proves it is interactable.
  func testShareSheetIsInteractable() throws {
    let app = XCUIApplication(bundleIdentifier: hostBundleId)
    app.launch()
    XCTAssertTrue(element(in: app, id: "screen-root").waitForExistence(timeout: 20))

    let openShare = element(in: app, id: "btn-open-share-sheet")
    XCTAssertTrue(
      openShare.waitForExistence(timeout: 10),
      "Host missing btn-open-share-sheet — rebuild Release after App.tsx change.\n\(app.debugDescription)"
    )
    safeTap(openShare)

    XCTAssertTrue(
      activityUIExists(in: app),
      "System Share Sheet did not appear from host.\n\(app.debugDescription)"
    )

    let extensionRow = findExtensionRow(in: app, named: extensionNameCandidates)
    XCTAssertTrue(
      extensionRow.waitForExistence(timeout: 15),
      "Extension \(extensionNameCandidates.joined(separator: " | ")) not in Share Sheet — check Release install + activation rules.\n\(app.debugDescription)"
    )
    XCTAssertTrue(
      extensionRow.isHittable,
      "Extension row exists but is not hittable (Share Sheet not interactable)"
    )

    // Prove the sheet itself responds to interaction without launching the appex
    // (appex launch/crash is out of scope for this C1 gate).
    let activity = app.descendants(matching: .any)["activityCollectionView"]
    if activity.waitForExistence(timeout: 2) {
      activity.swipeLeft()
      activity.swipeRight()
    } else if app.collectionViews.firstMatch.exists {
      app.collectionViews.firstMatch.swipeLeft()
    }

    // Row still present after swipe.
    XCTAssertTrue(
      findExtensionRow(in: app, named: extensionNameCandidates).waitForExistence(timeout: 5),
      "Extension row disappeared after Share Sheet interaction"
    )

    dismissShareSheet(in: app)
    XCTAssertTrue(
      element(in: app, id: "screen-root").waitForExistence(timeout: 10),
      "Host did not remain usable after dismissing Share Sheet"
    )
  }

  /// Opens the share extension process and asserts its UI appears (Release + embedded JS).
  func testShareExtensionLaunches() throws {
    let app = XCUIApplication(bundleIdentifier: hostBundleId)
    app.launch()
    XCTAssertTrue(element(in: app, id: "screen-root").waitForExistence(timeout: 20))

    let openShare = element(in: app, id: "btn-open-share-sheet")
    XCTAssertTrue(openShare.waitForExistence(timeout: 10))
    safeTap(openShare)
    XCTAssertTrue(activityUIExists(in: app), "Share Sheet missing")

    let extensionRow = findExtensionRow(in: app, named: extensionNameCandidates)
    XCTAssertTrue(extensionRow.waitForExistence(timeout: 15), "Extension row missing")
    safeTap(extensionRow)

    let ext = XCUIApplication(bundleIdentifier: extensionBundleId)
    let save = firstExisting(
      [
        ext.buttons["Save"],
        ext.staticTexts["Save"],
        ext.descendants(matching: .any)["Save"],
      ],
      timeout: 20
    )
    XCTAssertNotNil(
      save,
      "Share appex UI did not appear — likely missing embedded main.jsbundle or module name mismatch"
    )
    // Dismiss without requiring host payload round-trip.
    if let cancel = firstExisting(
      [ext.buttons["Cancel"], ext.staticTexts["Cancel"]],
      timeout: 3
    ) {
      safeTap(cancel)
    } else if let save {
      safeTap(save)
    }
  }

  // MARK: - Activity sheet helpers

  /// RN `testID` is an accessibility id; TouchableOpacity is often `otherElements`, not `buttons`.
  private func element(in app: XCUIApplication, id: String) -> XCUIElement {
    app.descendants(matching: .any)[id]
  }

  private func activityUIExists(in app: XCUIApplication) -> Bool {
    let markers: [XCUIElement] = [
      app.otherElements["ActivityListView"],
      app.collectionViews["ActivityListView"],
      app.otherElements.matching(NSPredicate(format: "identifier CONTAINS[c] %@", "ActivityList")).firstMatch,
      app.sheets.firstMatch,
      app.staticTexts["Copy"],
      app.staticTexts["Save to Files"],
      app.staticTexts["Edit Actions…"],
      app.staticTexts["Edit Actions..."],
      app.buttons["Close"],
    ]
    return markers.contains { $0.waitForExistence(timeout: 2) }
  }

  private func dismissShareSheet(in app: XCUIApplication) {
    if tapIfHittable(app.buttons["Close"], timeout: 2) { return }
    if tapIfHittable(app.buttons["Cancel"], timeout: 1) { return }
    // Tap outside / drag down the sheet.
    if app.sheets.firstMatch.exists {
      app.sheets.firstMatch.swipeDown()
      return
    }
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.05)).tap()
  }

  private func findExtensionRow(in app: XCUIApplication, named names: [String]) -> XCUIElement {
    func match(for name: String) -> XCUIElement? {
      let candidates = [
        app.cells.staticTexts[name],
        app.staticTexts[name],
        app.buttons[name],
        app.otherElements[name],
        app.descendants(matching: .any)[name],
      ]
      return candidates.first { $0.waitForExistence(timeout: 1.5) }
    }

    for name in names {
      if let hit = match(for: name) { return hit }
    }

    let activity = app.descendants(matching: .any)["activityCollectionView"]
    if activity.exists {
      activity.swipeLeft()
    } else if app.collectionViews.firstMatch.exists {
      app.collectionViews.firstMatch.swipeLeft()
    }

    for name in names {
      if let hit = match(for: name) { return hit }
    }

    if let apps = firstExisting(
      [app.buttons["Apps"], app.staticTexts["Apps"], app.cells.staticTexts["Apps"]],
      timeout: 2
    ) {
      safeTap(apps)
      for name in names {
        if let hit = match(for: name) { return hit }
      }
      // Back out of Apps list if we opened it.
      _ = tapIfHittable(app.buttons["Done"], timeout: 1)
        || tapIfHittable(app.buttons["Close"], timeout: 1)
    }

    return app.staticTexts[names[0]]
  }

  private func safeTap(_ element: XCUIElement) {
    guard element.exists else { return }
    if element.isHittable {
      element.tap()
    } else {
      element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }
  }

  private func tapIfHittable(_ element: XCUIElement, timeout: TimeInterval) -> Bool {
    guard element.waitForExistence(timeout: timeout) else { return false }
    safeTap(element)
    return true
  }

  private func firstExisting(_ elements: [XCUIElement], timeout: TimeInterval) -> XCUIElement? {
    for element in elements where element.waitForExistence(timeout: timeout) {
      return element
    }
    return nil
  }
}
