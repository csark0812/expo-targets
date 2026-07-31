import XCTest

/// Share Sheet smoke for expo-targets examples (Release simulator).
///
/// Attached via `@expo-targets/ios-harness` into a generated `ios/` project.
/// Scheme env (`UITEST_*`) selects host/extension/marker/complete-button labels.
///
/// C1 gate (two tests, one launch each — no redundant host-only launch):
/// 1. System Share Sheet is interactable (row visible, sheet dismisses).
/// 2. Completing the extension writes App Group data the host shows in
///    `text-last-payload` (marker substring).
final class ShareSheetSmoke: XCTestCase {
  private var hostBundleId: String {
    ProcessInfo.processInfo.environment["UITEST_HOST_BUNDLE_ID"]
      ?? "com.expotargets.example.share"
  }

  private var extensionName: String {
    ProcessInfo.processInfo.environment["UITEST_EXTENSION_NAME"]
      ?? "ET Share"
  }

  /// Substring that must appear in host `text-last-payload` after a successful save.
  private var payloadMarker: String {
    ProcessInfo.processInfo.environment["UITEST_PAYLOAD_MARKER"]
      ?? "expo-targets uitest share payload"
  }

  /// Optional text that must appear in the appex before tapping complete.
  private var readyText: String {
    ProcessInfo.processInfo.environment["UITEST_READY_TEXT"] ?? ""
  }

  private var completeButtonCandidates: [String] {
    let raw = ProcessInfo.processInfo.environment["UITEST_COMPLETE_BUTTON"]
      ?? "Save"
    return raw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
  }

  /// Exact Share Sheet row titles only (never bare "Action" — matches app-switcher).
  private var extensionNameCandidates: [String] {
    var names: [String] = [extensionName]
    if let hostName = ProcessInfo.processInfo.environment["UITEST_HOST_DISPLAY_NAME"], !hostName.isEmpty {
      names.append(hostName)
    }
    if let aliases = ProcessInfo.processInfo.environment["UITEST_EXTENSION_ALIASES"], !aliases.isEmpty {
      names.append(
        contentsOf: aliases.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
      )
    }
    var seen = Set<String>()
    return names.filter { !$0.isEmpty && seen.insert($0).inserted }
  }

  /// System rows we must never tap (coordinate-tap misfires land here after View More).
  private let blockedSheetLabels: Set<String> = [
    "Create Watch Face", "Watch Face", "Print", "Copy", "Save Image",
    "Save to Files", "Assign to Contact", "Add to Shared Album",
    "Edit Actions", "More", "View More", "View Less", "Apps", "Close", "Cancel",
  ]

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  /// Opens the system Share Sheet and proves the extension row is reachable.
  func testShareSheetIsInteractable() throws {
    let app = launchHost()
    openShareSheet(in: app)

    let extensionRow = findExtensionRow(in: app, named: extensionNameCandidates)
    XCTAssertTrue(
      extensionRow.waitForExistence(timeout: 15),
      "Extension \(extensionNameCandidates.joined(separator: " | ")) not in Share Sheet — check Release install, View More, displayName.\n\(shareSheetDebug(app))"
    )
    XCTAssertTrue(
      isAllowedExtensionRow(extensionRow),
      "Matched a blocked system row (\(extensionRow.label)) instead of \(extensionNameCandidates)"
    )

    dismissShareSheet(in: app)
    XCTAssertTrue(
      element(in: app, id: "screen-root").waitForExistence(timeout: 10),
      "Host did not remain usable after dismissing Share Sheet"
    )
  }

  /// Share → extension complete → host `text-last-payload` contains the marker.
  func testSharePayloadReachesHost() throws {
    let app = launchHost()

    let clear = element(in: app, id: "btn-clear-payload")
    if clear.waitForExistence(timeout: 5) {
      tapExact(clear)
    }
    XCTAssertTrue(
      waitForPayload(in: app, containing: "none", timeout: 10),
      "Could not clear host payload before share"
    )

    openShareSheet(in: app)

    let extensionRow = findExtensionRow(in: app, named: extensionNameCandidates)
    XCTAssertTrue(extensionRow.waitForExistence(timeout: 15), "Extension row missing.\n\(shareSheetDebug(app))")
    tapExtensionRow(extensionRow)

    // Query host + SpringBoard only. XCUIApplication(appex) can launch the plug-in as an app.
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    let uiRoots: [XCUIApplication] = [app, springboard]

    if !readyText.isEmpty {
      XCTAssertTrue(
        waitForReadyText(readyText, in: uiRoots, timeout: 25),
        "Appex never showed ready text \(readyText) — shared payload not delivered."
      )
    } else {
      RunLoop.current.run(until: Date().addingTimeInterval(1.0))
    }

    let complete = findCompleteControl(in: uiRoots, timeout: 20)
    XCTAssertNotNil(
      complete,
      "Appex complete control \(completeButtonCandidates) missing.\nhost=\(app.debugDescription)"
    )
    tapExact(complete!)

    // Let setData + completeRequest finish before activating the host.
    waitForExtensionFinished(complete: complete!, roots: uiRoots, timeout: 20)

    app.activate()
    XCTAssertTrue(
      element(in: app, id: "screen-root").waitForExistence(timeout: 15),
      "Host did not become active after extension finished"
    )

    XCTAssertTrue(
      waitForPayload(in: app, containing: payloadMarker, timeout: 25),
      "Host text-last-payload missing marker \(payloadMarker) after share/save.\nlabel=\(payloadLabel(in: app))"
    )
  }

  // MARK: - Launch / sheet

  private func launchHost() -> XCUIApplication {
    let app = XCUIApplication(bundleIdentifier: hostBundleId)
    app.launchArguments = ["--uitest-share-sheet"]
    app.launch()
    XCTAssertTrue(
      element(in: app, id: "screen-root").waitForExistence(timeout: 20),
      "Host screen-root missing for \(hostBundleId)"
    )
    return app
  }

  private func openShareSheet(in app: XCUIApplication) {
    let openShare = element(in: app, id: "btn-open-share-sheet")
    XCTAssertTrue(
      openShare.waitForExistence(timeout: 10),
      "Host missing btn-open-share-sheet — rebuild Release after App.tsx change."
    )
    // Image Share.share (Asset.loadAsync → file URL) is still occasionally a no-op on iOS 26.
    for attempt in 1...4 {
      tapExact(openShare)
      let wait = attempt == 1 ? 4.0 : 7.0
      let deadline = Date().addingTimeInterval(wait)
      while Date() < deadline {
        if activityUIVisible(in: app) { return }
        RunLoop.current.run(until: Date().addingTimeInterval(0.25))
      }
      // Dismiss a half-presented sheet before retrying.
      dismissShareSheet(in: app)
      RunLoop.current.run(until: Date().addingTimeInterval(0.4))
    }
    XCTFail("System Share Sheet did not appear from host after 4 attempts.")
  }

  // MARK: - Extension row discovery (exact labels only)

  private func findExtensionRow(in app: XCUIApplication, named names: [String]) -> XCUIElement {
    if let hit = firstExistingExtensionRow(in: app, named: names, timeout: 0.5) {
      return hit
    }

    // Action extensions sit behind View More; share apps behind More.
    openOverflowIfNeeded(in: app)

    if let hit = firstExistingExtensionRow(in: app, named: names, timeout: 2) {
      return hit
    }

    // Expanded action list is vertical — scroll for the exact row.
    for _ in 0..<6 {
      if app.tables.firstMatch.exists {
        app.tables.firstMatch.swipeUp()
      } else if app.collectionViews.count > 1 {
        app.collectionViews.element(boundBy: app.collectionViews.count - 1).swipeUp()
      } else {
        app.swipeUp()
      }
      if let hit = firstExistingExtensionRow(in: app, named: names, timeout: 0.6) {
        return hit
      }
    }

    return exactLabeledElement(in: app, name: names[0])
  }

  private func firstExistingExtensionRow(
    in app: XCUIApplication,
    named names: [String],
    timeout: TimeInterval
  ) -> XCUIElement? {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      for name in names {
        let el = exactLabeledElement(in: app, name: name)
        if el.exists, isAllowedExtensionRow(el) {
          return el
        }
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.15))
    }
    return nil
  }

  private func exactLabeledElement(in app: XCUIApplication, name: String) -> XCUIElement {
    // Prefer cells (Share Sheet rows). firstMatch avoids multi-match crashes on iOS 26.
    let cell = app.cells
      .matching(NSPredicate(format: "label ==[c] %@", name))
      .firstMatch
    if cell.exists { return cell }

    return app.descendants(matching: .any)
      .matching(NSPredicate(format: "label ==[c] %@ OR identifier ==[c] %@", name, name))
      .firstMatch
  }

  private func openOverflowIfNeeded(in app: XCUIApplication) {
    for label in ["View More", "More", "Apps"] {
      let overflow = app.descendants(matching: .any)
        .matching(NSPredicate(format: "label ==[c] %@", label))
        .firstMatch
      guard overflow.waitForExistence(timeout: 1.2) else { continue }
      // Only tap if we still cannot see any candidate.
      if firstExistingExtensionRow(in: app, named: extensionNameCandidates, timeout: 0.2) != nil {
        return
      }
      tapExact(overflow)
      RunLoop.current.run(until: Date().addingTimeInterval(0.7))
      return
    }
  }

  private func isAllowedExtensionRow(_ element: XCUIElement) -> Bool {
    guard element.exists else { return false }
    let label = element.label.trimmingCharacters(in: .whitespacesAndNewlines)
    if label.isEmpty { return false }
    if blockedSheetLabels.contains(where: { label.compare($0, options: .caseInsensitive) == .orderedSame }) {
      return false
    }
    // Extra guard: Watch Face / system titles that sometimes include punctuation.
    let lowered = label.lowercased()
    if lowered.contains("watch face") || lowered == "print" || lowered == "copy" {
      return false
    }
    return true
  }

  private func tapExtensionRow(_ element: XCUIElement) {
    XCTAssertTrue(
      isAllowedExtensionRow(element),
      "Refusing to tap blocked/system row label=\(element.label)"
    )
    // Prefer tapping the cell; if XCTest says non-hittable, use the label's own frame
    // only when the label still matches a candidate name.
    if element.isHittable {
      element.tap()
      return
    }
    let label = element.label
    XCTAssertTrue(
      extensionNameCandidates.contains(where: { $0.compare(label, options: .caseInsensitive) == .orderedSame }),
      "Non-hittable row label \(label) is not an extension candidate — refusing coordinate tap (Watch Face risk)"
    )
    element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
  }

  // MARK: - Appex complete

  private func findCompleteControl(in roots: [XCUIApplication], timeout: TimeInterval) -> XCUIElement? {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      for root in roots {
        let byId = element(in: root, id: "btn-complete")
        if byId.exists { return byId }
        for label in completeButtonCandidates {
          let button = root.buttons[label]
          if button.exists { return button }
          let any = root.descendants(matching: .any)
            .matching(NSPredicate(format: "label ==[c] %@", label))
            .firstMatch
          if any.exists { return any }
        }
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.4))
    }
    return nil
  }

  private func waitForReadyText(_ text: String, in roots: [XCUIApplication], timeout: TimeInterval) -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      for root in roots {
        let ready = root.descendants(matching: .any)
          .matching(NSPredicate(format: "label CONTAINS[c] %@ OR value CONTAINS[c] %@", text, text))
          .firstMatch
        if ready.exists { return true }
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.4))
    }
    return false
  }

  private func waitForExtensionFinished(
    complete: XCUIElement,
    roots: [XCUIApplication],
    timeout: TimeInterval
  ) {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      if !complete.exists { return }
      for root in roots {
        // Only Close after a "done" title — Close alone cancels without persisting.
        for title in ["Saved", "Processed"] {
          if root.buttons[title].exists {
            let close = root.buttons["Close"].exists
              ? root.buttons["Close"]
              : element(in: root, id: "btn-close")
            if close.exists { tapExact(close) }
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
            if !complete.exists { return }
          }
        }
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.3))
    }
  }

  // MARK: - Host payload

  private func element(in app: XCUIApplication, id: String) -> XCUIElement {
    app.descendants(matching: .any)[id]
  }

  private func payloadLabel(in app: XCUIApplication) -> String {
    let el = element(in: app, id: "text-last-payload")
    guard el.exists else { return "<missing>" }
    return el.label.isEmpty ? (el.value as? String ?? "<empty>") : el.label
  }

  private func waitForPayload(in app: XCUIApplication, containing needle: String, timeout: TimeInterval) -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      if payloadLabel(in: app).contains(needle) { return true }
      let refresh = element(in: app, id: "btn-refresh")
      if refresh.exists {
        // Retry: Share Sheet dismissal can invalidate the element mid-tap.
        for _ in 0..<3 {
          if !refresh.exists { break }
          if refresh.isHittable {
            refresh.tap()
            break
          }
          refresh.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
          break
        }
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    }
    return payloadLabel(in: app).contains(needle)
  }

  // MARK: - Sheet chrome

  private func activityUIVisible(in app: XCUIApplication) -> Bool {
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    for root in [app, springboard] {
      let markers: [XCUIElement] = [
        root.otherElements["ActivityListView"],
        root.collectionViews["ActivityListView"],
        root.otherElements["ActivityContentView"],
        root.staticTexts["Copy"],
        root.buttons["Copy"],
        root.staticTexts["Save to Files"],
        root.staticTexts["Save Image"],
        root.buttons["Save Image"],
        root.staticTexts["View More"],
        root.buttons["View More"],
        root.staticTexts["More"],
        root.buttons["More"],
        root.buttons["Close"],
      ]
      if markers.contains(where: \.exists) { return true }
    }
    return false
  }

  private func activityUIExists(in app: XCUIApplication) -> Bool {
    let deadline = Date().addingTimeInterval(8)
    while Date() < deadline {
      if activityUIVisible(in: app) { return true }
      RunLoop.current.run(until: Date().addingTimeInterval(0.25))
    }
    return false
  }

  private func dismissShareSheet(in app: XCUIApplication) {
    if tapIfExists(app.buttons["Close"], timeout: 2) { return }
    if tapIfExists(app.buttons["Cancel"], timeout: 1) { return }
    if app.sheets.firstMatch.exists {
      app.sheets.firstMatch.swipeDown()
      return
    }
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.05)).tap()
  }

  private func shareSheetDebug(_ app: XCUIApplication) -> String {
    let labels = app.descendants(matching: .any).allElementsBoundByIndex
      .prefix(80)
      .compactMap { el -> String? in
        let label = el.label
        return label.isEmpty ? nil : label
      }
    return "visibleLabels=\(labels)"
  }

  // MARK: - Taps

  private func tapExact(_ element: XCUIElement) {
    guard element.exists else { return }
    if element.isHittable {
      element.tap()
    } else {
      element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }
  }

  private func tapIfExists(_ element: XCUIElement, timeout: TimeInterval) -> Bool {
    guard element.waitForExistence(timeout: timeout) else { return false }
    tapExact(element)
    return true
  }
}
