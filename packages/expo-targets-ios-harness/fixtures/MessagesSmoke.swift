import XCTest

/// Messages app extension smoke (Release). Drive com.apple.MobileSMS.
/// Proof bar: ag-handoff — Send template → host text-last-payload marker.
///
/// iOS 17+/26 flake class: conversation `+` opens attachment popup; coordinate
/// swipe-up reveals iMessage apps (do not tap Stickers — that opens sticker UI).
final class MessagesSmoke: XCTestCase {
  private var hostBundleId: String {
    ProcessInfo.processInfo.environment["UITEST_HOST_BUNDLE_ID"]
      ?? "com.expotargets.example.messages"
  }

  private var extensionName: String {
    ProcessInfo.processInfo.environment["UITEST_EXTENSION_NAME"]
      ?? "Example Messages"
  }

  private var extensionNameCandidates: [String] {
    var names = [extensionName]
    if let aliases = ProcessInfo.processInfo.environment["UITEST_EXTENSION_ALIASES"], !aliases.isEmpty {
      names.append(
        contentsOf: aliases.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
      )
    }
    var seen = Set<String>()
    return names.filter { !$0.isEmpty && seen.insert($0).inserted }
  }

  private var payloadMarker: String {
    ProcessInfo.processInfo.environment["UITEST_PAYLOAD_MARKER"]
      ?? "Hello from expo-targets"
  }

  private var sendButtonLabel: String {
    ProcessInfo.processInfo.environment["UITEST_SEND_BUTTON"]
      ?? "Send template"
  }

  private var conversationName: String {
    ProcessInfo.processInfo.environment["UITEST_CONVERSATION"]
      ?? "+1 (888) 555-1212"
  }

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testMessagesExtensionIsReachable() throws {
    let messages = launchMessages()
    openConversation(in: messages)
    openAppDrawer(in: messages)
    let row = findExtensionRow(in: messages)
    XCTAssertTrue(
      row.waitForExistence(timeout: 8),
      "Extension \(extensionNameCandidates.joined(separator: " | ")) not after + → swipe-up.\n\(debugLabels(messages))"
    )
  }

  func testSendTemplateReachesHost() throws {
    let host = XCUIApplication(bundleIdentifier: hostBundleId)
    host.launchArguments = ["--uitest-messages"]
    host.launch()
    XCTAssertTrue(host.descendants(matching: .any)["screen-root"].waitForExistence(timeout: 20))
    let clear = host.descendants(matching: .any)["btn-clear-payload"]
    if clear.waitForExistence(timeout: 5) {
      tapExact(clear)
    }

    let messages = launchMessages()
    openConversation(in: messages)
    openAppDrawer(in: messages)
    let row = findExtensionRow(in: messages)
    XCTAssertTrue(row.waitForExistence(timeout: 8), "Extension row missing.\n\(debugLabels(messages))")
    tapExact(row)
    expandExtensionSheet(in: messages)
    RunLoop.current.run(until: Date().addingTimeInterval(3.0))

    let send = findSendControl(in: messages)
    XCTAssertTrue(
      send.waitForExistence(timeout: 25),
      "Send control \(sendButtonLabel) missing — need Release jsbundle in appex.\n\(debugLabels(messages))"
    )
    tapExact(send)
    RunLoop.current.run(until: Date().addingTimeInterval(1.5))

    host.activate()
    XCTAssertTrue(host.descendants(matching: .any)["screen-root"].waitForExistence(timeout: 15))
    let refresh = host.descendants(matching: .any)["btn-refresh"]
    if refresh.exists { tapExact(refresh) }
    if !payloadContains(host, payloadMarker) {
      host.terminate()
      host.launch()
      XCTAssertTrue(host.descendants(matching: .any)["screen-root"].waitForExistence(timeout: 20))
    }
    XCTAssertTrue(
      waitForPayload(in: host, containing: payloadMarker, timeout: 25),
      "Host text-last-payload missing marker \(payloadMarker).\nlabel=\(payloadLabel(in: host))"
    )
  }

  private func launchMessages() -> XCUIApplication {
    let messages = XCUIApplication(bundleIdentifier: "com.apple.MobileSMS")
    messages.terminate()
    messages.launch()
    XCTAssertTrue(messages.wait(for: .runningForeground, timeout: 15))
    dismissNewMessageIfNeeded(in: messages)
    let cont = messages.buttons["Continue"]
    if cont.waitForExistence(timeout: 2) { tapExact(cont) }
    return messages
  }

  private func dismissNewMessageIfNeeded(in messages: XCUIApplication) {
    if messages.navigationBars["New Message"].waitForExistence(timeout: 1.5) {
      let navBtns = messages.navigationBars.buttons
      if navBtns.count > 0 {
        tapExact(navBtns.element(boundBy: navBtns.count - 1))
        RunLoop.current.run(until: Date().addingTimeInterval(0.6))
      }
    }
  }

  private func openConversation(in messages: XCUIApplication) {
    dismissNewMessageIfNeeded(in: messages)
    for name in [conversationName, "+1 (888) 555-1212", "Kate Bell", "+1 (555) 564-8583"] {
      let named = messages.cells.staticTexts[name]
      if named.waitForExistence(timeout: 2) {
        tapExact(named)
        return
      }
    }
    let first = messages.cells.firstMatch
    XCTAssertTrue(first.waitForExistence(timeout: 10), "No Messages conversation cells")
    tapExact(first)
  }

  private func openAppDrawer(in messages: XCUIApplication) {
    if findExtensionRow(in: messages).exists { return }

    let add = messages.buttons["add"]
    XCTAssertTrue(add.waitForExistence(timeout: 5), "Messages + (add) missing.\n\(debugLabels(messages))")
    tapExact(add)
    RunLoop.current.run(until: Date().addingTimeInterval(0.8))

    // Swipe attachment sheet — do not tap Stickers.
    for _ in 0..<5 {
      if findExtensionRow(in: messages).exists { return }
      let start = messages.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.72))
      let end = messages.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.28))
      start.press(forDuration: 0.1, thenDragTo: end)
      RunLoop.current.run(until: Date().addingTimeInterval(0.7))
    }
  }

  private func expandExtensionSheet(in messages: XCUIApplication) {
    if messages.otherElements["Sheet Grabber"].exists {
      let g = messages.otherElements["Sheet Grabber"]
      let start = g.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
      let end = messages.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.12))
      start.press(forDuration: 0.15, thenDragTo: end)
    } else {
      let start = messages.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.65))
      let end = messages.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.15))
      start.press(forDuration: 0.15, thenDragTo: end)
    }
    RunLoop.current.run(until: Date().addingTimeInterval(0.8))
  }

  private func findExtensionRow(in app: XCUIApplication) -> XCUIElement {
    for name in extensionNameCandidates {
      let text = app.staticTexts[name]
      if text.exists { return text }
      let cell = app.cells.staticTexts[name]
      if cell.exists { return cell }
    }
    return app.staticTexts[extensionName]
  }

  private func findSendControl(in app: XCUIApplication) -> XCUIElement {
    let byId = app.descendants(matching: .any)["btn-send-template"]
    if byId.exists { return byId }
    let byLabel = app.buttons[sendButtonLabel]
    if byLabel.exists { return byLabel }
    let byText = app.staticTexts[sendButtonLabel]
    if byText.exists { return byText }
    return app.descendants(matching: .any)
      .matching(NSPredicate(format: "label ==[c] %@ OR identifier ==[c] %@", sendButtonLabel, "btn-send-template"))
      .firstMatch
  }

  private func payloadLabel(in app: XCUIApplication) -> String {
    let el = app.descendants(matching: .any)["text-last-payload"]
    guard el.exists else { return "<missing>" }
    return el.label.isEmpty ? (el.value as? String ?? "<empty>") : el.label
  }

  private func payloadContains(_ app: XCUIApplication, _ needle: String) -> Bool {
    payloadLabel(in: app).contains(needle)
  }

  private func waitForPayload(in app: XCUIApplication, containing needle: String, timeout: TimeInterval) -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      if payloadContains(app, needle) { return true }
      let refresh = app.descendants(matching: .any)["btn-refresh"]
      if refresh.exists { tapExact(refresh) }
      RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    }
    return payloadContains(app, needle)
  }

  private func debugLabels(_ app: XCUIApplication) -> String {
    let desc = app.debugDescription
    if desc.count <= 1200 { return desc }
    return String(desc.prefix(1200)) + "…"
  }

  private func tapExact(_ element: XCUIElement) {
    guard element.exists else { return }
    if element.isHittable {
      element.tap()
    } else {
      element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }
  }
}
