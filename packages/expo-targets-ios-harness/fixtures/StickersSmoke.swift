import XCTest

/// Sticker pack smoke (Release). Drive com.apple.MobileSMS.
/// Proof bar: pack-interact — Fun Stickers visible + sticker tappable (send=false).
///
/// Asset-only sticker packs live in the Stickers browser, not the iMessage apps
/// drawer used by Messages extensions. Flow: host launch (register) → conversation
/// → `+` → Stickers → pack → tap sticker. Do not swipe for apps / do not send.
final class StickersSmoke: XCTestCase {
  private var hostBundleId: String {
    ProcessInfo.processInfo.environment["UITEST_HOST_BUNDLE_ID"]
      ?? "com.expotargets.example.stickers"
  }

  private var packName: String {
    ProcessInfo.processInfo.environment["UITEST_PACK_NAME"]
      ?? "Fun Stickers"
  }

  private var packNameCandidates: [String] {
    var names = [packName]
    if let aliases = ProcessInfo.processInfo.environment["UITEST_EXTENSION_ALIASES"], !aliases.isEmpty {
      names.append(
        contentsOf: aliases.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
      )
    }
    var seen = Set<String>()
    return names.filter { !$0.isEmpty && seen.insert($0).inserted }
  }

  private var conversationName: String {
    ProcessInfo.processInfo.environment["UITEST_CONVERSATION"]
      ?? "+1 (888) 555-1212"
  }

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testStickerPackIsVisible() throws {
    registerHost()
    let messages = launchMessages()
    openConversation(in: messages)
    openStickersBrowser(in: messages)
    let pack = findPackControl(in: messages)
    XCTAssertTrue(
      pack.waitForExistence(timeout: 12),
      "Pack \(packNameCandidates.joined(separator: " | ")) not after + → Stickers.\n\(debugLabels(messages))"
    )
  }

  func testStickerIsTappable() throws {
    registerHost()
    let messages = launchMessages()
    openConversation(in: messages)
    openStickersBrowser(in: messages)
    let pack = findPackControl(in: messages)
    XCTAssertTrue(pack.waitForExistence(timeout: 12), "Pack missing.\n\(debugLabels(messages))")
    tapExact(pack)
    RunLoop.current.run(until: Date().addingTimeInterval(1.5))
    expandSheet(in: messages)

    let sticker = firstStickerCandidate(in: messages)
    XCTAssertTrue(
      sticker.waitForExistence(timeout: 15),
      "No tappable sticker in \(packName).\n\(debugLabels(messages))"
    )
    tapExact(sticker)
    // send=false hard bar — tap is enough; do not assert transcript.
    RunLoop.current.run(until: Date().addingTimeInterval(0.5))
  }

  /// Launch the host once so MobileSMS picks up the freshly installed sticker appex.
  private func registerHost() {
    let host = XCUIApplication(bundleIdentifier: hostBundleId)
    host.launch()
    _ = host.wait(for: .runningForeground, timeout: 20)
    RunLoop.current.run(until: Date().addingTimeInterval(1.0))
    host.terminate()
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
    for name in [conversationName, "+1 (888) 555-1212", "+1 (555) 564-8583"] {
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

  private func openStickersBrowser(in messages: XCUIApplication) {
    if findPackControl(in: messages).exists { return }

    let add = messages.buttons["add"]
    XCTAssertTrue(add.waitForExistence(timeout: 5), "Messages + (add) missing.\n\(debugLabels(messages))")
    tapExact(add)
    RunLoop.current.run(until: Date().addingTimeInterval(1.0))

    let stickers = findStickersEntry(in: messages)
    XCTAssertTrue(
      stickers.waitForExistence(timeout: 8),
      "Stickers entry missing after +.\n\(debugLabels(messages))"
    )
    tapExact(stickers)
    RunLoop.current.run(until: Date().addingTimeInterval(1.5))

    // First-run: enable pack via Edit if it is not already visible.
    if !findPackControl(in: messages).exists {
      enablePackIfNeeded(in: messages)
    }
  }

  private func findStickersEntry(in app: XCUIApplication) -> XCUIElement {
    let button = app.buttons["Stickers"]
    if button.exists { return button }
    let cell = app.cells.staticTexts["Stickers"]
    if cell.exists { return cell }
    let text = app.staticTexts["Stickers"]
    if text.exists { return text }
    return app.descendants(matching: .any)
      .matching(NSPredicate(format: "label ==[c] %@", "Stickers"))
      .firstMatch
  }

  private func enablePackIfNeeded(in messages: XCUIApplication) {
    let edit = messages.buttons["Edit"]
    if edit.waitForExistence(timeout: 3) {
      tapExact(edit)
      RunLoop.current.run(until: Date().addingTimeInterval(1.0))
    }

    for name in packNameCandidates {
      let switchControl = messages.switches[name]
      if switchControl.waitForExistence(timeout: 2) {
        if (switchControl.value as? String) != "1" {
          tapExact(switchControl)
        }
      }
      let cell = messages.cells.staticTexts[name]
      if cell.exists { tapExact(cell) }
    }

    for doneLabel in ["Done", "Close"] {
      let done = messages.buttons[doneLabel]
      if done.waitForExistence(timeout: 2) {
        tapExact(done)
        RunLoop.current.run(until: Date().addingTimeInterval(0.8))
        break
      }
    }
  }

  private func expandSheet(in messages: XCUIApplication) {
    if messages.otherElements["Sheet Grabber"].exists {
      let g = messages.otherElements["Sheet Grabber"]
      let start = g.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
      let end = messages.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.12))
      start.press(forDuration: 0.15, thenDragTo: end)
    }
    RunLoop.current.run(until: Date().addingTimeInterval(0.8))
  }

  private func findPackControl(in app: XCUIApplication) -> XCUIElement {
    for name in packNameCandidates {
      let button = app.buttons[name]
      if button.exists { return button }
      let text = app.staticTexts[name]
      if text.exists { return text }
      let cell = app.cells.staticTexts[name]
      if cell.exists { return cell }
      let any = app.descendants(matching: .any)
        .matching(NSPredicate(format: "label ==[c] %@", name))
        .firstMatch
      if any.exists { return any }
    }
    return app.buttons[packName]
  }

  private func firstStickerCandidate(in app: XCUIApplication) -> XCUIElement {
    // Prefer stickers inside a collection / scroll view rather than chrome icons.
    let collectionCells = app.collectionViews.cells
    if collectionCells.count > 0 {
      return collectionCells.element(boundBy: 0)
    }
    let images = app.images
    if images.count > 0 {
      // Skip tiny chrome; prefer a mid/large image when available.
      for i in 0..<min(images.count, 12) {
        let image = images.element(boundBy: i)
        let frame = image.frame
        if frame.width >= 40 && frame.height >= 40 {
          return image
        }
      }
      return images.element(boundBy: 0)
    }
    return app.descendants(matching: .any)
      .matching(NSPredicate(format: "label CONTAINS[c] %@", "sticker"))
      .firstMatch
  }

  private func debugLabels(_ app: XCUIApplication) -> String {
    let desc = app.debugDescription
    if desc.count <= 1800 { return desc }
    return String(desc.prefix(1800)) + "…"
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
