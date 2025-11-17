import XCTest
import Foundation
import UIKit
@testable import ExpoTargetsExtension

/// Comprehensive unit tests for ExpoTargetsExtensionModule
/// Tests extension context operations, data retrieval, and host app communication
class ExpoTargetsExtensionModuleTests: XCTestCase {
    
    var mockContext: MockExtensionContext!
    
    // MARK: - Setup & Teardown
    
    override func setUp() {
        super.setUp()
        mockContext = MockExtensionContext()
    }
    
    override func tearDown() {
        mockContext.reset()
        mockContext = nil
        super.tearDown()
    }
    
    // MARK: - Close Extension Tests
    
    func testCloseExtension_CompletesRequest() {
        // When
        mockContext.completeRequest(returningItems: nil, completionHandler: nil)
        
        // Then
        XCTAssertTrue(mockContext.completeRequestCalled)
        XCTAssertNil(mockContext.completionItems)
    }
    
    func testCloseExtension_WithItems() {
        // Given
        let items = ["item1", "item2"]
        
        // When
        mockContext.completeRequest(returningItems: items, completionHandler: nil)
        
        // Then
        XCTAssertTrue(mockContext.completeRequestCalled)
        XCTAssertNotNil(mockContext.completionItems)
        XCTAssertEqual(mockContext.completionItems?.count, 2)
    }
    
    func testCloseExtension_CallsCompletionHandler() {
        // Given
        let expectation = XCTestExpectation(description: "Completion handler called")
        
        // When
        mockContext.completeRequest(returningItems: nil) { success in
            XCTAssertTrue(success)
            expectation.fulfill()
        }
        
        // Then
        wait(for: [expectation], timeout: 1.0)
    }
    
    func testCancelRequest_WithError() {
        // Given
        let error = NSError(domain: "test", code: 123, userInfo: nil)
        
        // When
        mockContext.cancelRequest(withError: error)
        
        // Then
        XCTAssertTrue(mockContext.cancelRequestCalled)
    }
    
    // MARK: - Get Shared Data - Text Tests
    
    func testGetSharedData_ReturnsNilWhenNoItems() {
        // Given - mockContext has no input items
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNil(data)
    }
    
    func testGetSharedData_ExtractsPlainText() {
        // Given
        let testText = "Hello, World!"
        mockContext.addMockTextItem(testText)
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        XCTAssertEqual(data?["text"] as? String, testText)
    }
    
    func testGetSharedData_ExtractsMultilineText() {
        // Given
        let multilineText = """
        Line 1
        Line 2
        Line 3
        """
        mockContext.addMockTextItem(multilineText)
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        XCTAssertEqual(data?["text"] as? String, multilineText)
    }
    
    func testGetSharedData_ExtractsTextWithSpecialCharacters() {
        // Given
        let specialText = "Hello! 👋 @#$%^&*() \n\t"
        mockContext.addMockTextItem(specialText)
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        XCTAssertEqual(data?["text"] as? String, specialText)
    }
    
    func testGetSharedData_ExtractsUnicodeText() {
        // Given
        let unicodeText = "Hello 世界 🌍 مرحبا Привет"
        mockContext.addMockTextItem(unicodeText)
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        XCTAssertEqual(data?["text"] as? String, unicodeText)
    }
    
    // MARK: - Get Shared Data - URL Tests
    
    func testGetSharedData_ExtractsURL() {
        // Given
        let testURL = URL(string: "https://example.com")!
        mockContext.addMockURLItem(testURL)
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        XCTAssertEqual(data?["url"] as? String, testURL.absoluteString)
    }
    
    func testGetSharedData_ExtractsURLWithQueryParameters() {
        // Given
        let testURL = URL(string: "https://example.com/path?key1=value1&key2=value2")!
        mockContext.addMockURLItem(testURL)
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        XCTAssertEqual(data?["url"] as? String, testURL.absoluteString)
    }
    
    func testGetSharedData_ExtractsURLWithFragment() {
        // Given
        let testURL = URL(string: "https://example.com/page#section")!
        mockContext.addMockURLItem(testURL)
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        XCTAssertEqual(data?["url"] as? String, testURL.absoluteString)
    }
    
    func testGetSharedData_ExtractsCustomSchemeURL() {
        // Given
        let testURL = URL(string: "myapp://open/path")!
        mockContext.addMockURLItem(testURL)
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        XCTAssertEqual(data?["url"] as? String, testURL.absoluteString)
    }
    
    // MARK: - Get Shared Data - Image Tests
    
    func testGetSharedData_ExtractsSingleImage() {
        // Given
        let testImage = createTestImage()
        mockContext.addMockImageItem(testImage)
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        let images = data?["images"] as? [String]
        XCTAssertNotNil(images)
        XCTAssertEqual(images?.count, 1)
    }
    
    func testGetSharedData_ExtractsMultipleImages() {
        // Given
        mockContext.addMockImageItem(createTestImage())
        mockContext.addMockImageItem(createTestImage())
        mockContext.addMockImageItem(createTestImage())
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        let images = data?["images"] as? [String]
        XCTAssertNotNil(images)
        XCTAssertEqual(images?.count, 3)
    }
    
    // MARK: - Get Shared Data - Mixed Content Tests
    
    func testGetSharedData_ExtractsMixedContent() {
        // Given
        mockContext.addMockTextItem("Sample text")
        mockContext.addMockURLItem(URL(string: "https://example.com")!)
        mockContext.addMockImageItem(createTestImage())
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        XCTAssertEqual(data?["text"] as? String, "Sample text")
        XCTAssertEqual(data?["url"] as? String, "https://example.com")
        let images = data?["images"] as? [String]
        XCTAssertNotNil(images)
        XCTAssertEqual(images?.count, 1)
    }
    
    func testGetSharedData_HandlesEmptyAttachments() {
        // Given
        let item = NSExtensionItem()
        item.attachments = []
        mockContext.mockInputItems = [item]
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNil(data)
    }
    
    // MARK: - Open Host App Tests
    
    func testOpenHostApp_CreatesCorrectURL() {
        // Given
        let path = "home/profile"
        let expectedScheme = "com.example.app"
        
        // When/Then
        let url = createHostAppURL(bundleId: expectedScheme, path: path)
        XCTAssertEqual(url?.scheme, expectedScheme)
        XCTAssertTrue(url?.absoluteString.contains(path) ?? false)
    }
    
    func testOpenHostApp_RemovesShareExtensionSuffix() {
        // Given
        let extensionBundleId = "com.example.app.ShareExtension"
        let expectedAppBundleId = "com.example.app"
        
        // When
        let appBundleId = removeExtensionSuffix(from: extensionBundleId)
        
        // Then
        XCTAssertEqual(appBundleId, expectedAppBundleId)
    }
    
    func testOpenHostApp_RemovesShareSuffix() {
        // Given
        let extensionBundleId = "com.example.app.share"
        let expectedAppBundleId = "com.example.app"
        
        // When
        let appBundleId = removeExtensionSuffix(from: extensionBundleId)
        
        // Then
        XCTAssertEqual(appBundleId, expectedAppBundleId)
    }
    
    func testOpenHostApp_RemovesActionSuffix() {
        // Given
        let extensionBundleId = "com.example.app.action"
        let expectedAppBundleId = "com.example.app"
        
        // When
        let appBundleId = removeExtensionSuffix(from: extensionBundleId)
        
        // Then
        XCTAssertEqual(appBundleId, expectedAppBundleId)
    }
    
    func testOpenHostApp_RemovesClipSuffix() {
        // Given
        let extensionBundleId = "com.example.app.clip"
        let expectedAppBundleId = "com.example.app"
        
        // When
        let appBundleId = removeExtensionSuffix(from: extensionBundleId)
        
        // Then
        XCTAssertEqual(appBundleId, expectedAppBundleId)
    }
    
    func testOpenHostApp_HandlesNoBundleIdentifier() {
        // This is an edge case - should handle gracefully
        let appBundleId = removeExtensionSuffix(from: "")
        XCTAssertEqual(appBundleId, "")
    }
    
    func testOpenHostApp_WithEmptyPath() {
        // Given
        let path = ""
        let bundleId = "com.example.app"
        
        // When
        let url = createHostAppURL(bundleId: bundleId, path: path)
        
        // Then
        XCTAssertNotNil(url)
        XCTAssertEqual(url?.scheme, bundleId)
    }
    
    func testOpenHostApp_WithDeepLinkPath() {
        // Given
        let path = "product/123/details"
        let bundleId = "com.example.app"
        
        // When
        let url = createHostAppURL(bundleId: bundleId, path: path)
        
        // Then
        XCTAssertNotNil(url)
        XCTAssertTrue(url?.absoluteString.contains(path) ?? false)
    }
    
    func testOpenHostApp_WithSpecialCharactersInPath() {
        // Given
        let path = "search?query=test&filter=all"
        let bundleId = "com.example.app"
        
        // When
        let url = createHostAppURL(bundleId: bundleId, path: path)
        
        // Then
        XCTAssertNotNil(url)
    }
    
    // MARK: - Edge Cases Tests
    
    func testMultipleExtensionItemsProcessing() {
        // Given
        let item1 = NSExtensionItem()
        let itemProvider1 = NSItemProvider(item: "text1" as NSString, typeIdentifier: "public.plain-text")
        item1.attachments = [itemProvider1]
        
        let item2 = NSExtensionItem()
        let itemProvider2 = NSItemProvider(item: "text2" as NSString, typeIdentifier: "public.plain-text")
        item2.attachments = [itemProvider2]
        
        mockContext.mockInputItems = [item1, item2]
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNotNil(data)
        // Should extract from first item with text
        XCTAssertNotNil(data?["text"] as? String)
    }
    
    func testExtensionContext_NilAttachments() {
        // Given
        let item = NSExtensionItem()
        item.attachments = nil
        mockContext.mockInputItems = [item]
        
        // When
        let data = extractSharedData(from: mockContext)
        
        // Then
        XCTAssertNil(data)
    }
    
    // MARK: - Performance Tests
    
    func testPerformance_ExtractLargeText() {
        // Given
        let largeText = String(repeating: "Lorem ipsum dolor sit amet. ", count: 1000)
        mockContext.addMockTextItem(largeText)
        
        measure {
            _ = extractSharedData(from: mockContext)
        }
    }
    
    func testPerformance_ExtractMultipleImages() {
        // Given
        for _ in 0..<10 {
            mockContext.addMockImageItem(createTestImage())
        }
        
        measure {
            _ = extractSharedData(from: mockContext)
        }
    }
    
    // MARK: - Helper Methods
    
    private func extractSharedData(from context: MockExtensionContext) -> [String: Any]? {
        guard let extensionItem = context.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments else {
            return nil
        }
        
        var result: [String: Any] = [:]
        
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier("public.plain-text") {
                let expectation = XCTestExpectation(description: "Load text")
                attachment.loadItem(forTypeIdentifier: "public.plain-text", options: nil) { data, error in
                    if let text = data as? String {
                        result["text"] = text
                    }
                    expectation.fulfill()
                }
                wait(for: [expectation], timeout: 2.0)
            }
            
            if attachment.hasItemConformingToTypeIdentifier("public.url") {
                let expectation = XCTestExpectation(description: "Load URL")
                attachment.loadItem(forTypeIdentifier: "public.url", options: nil) { data, error in
                    if let url = data as? URL {
                        result["url"] = url.absoluteString
                    }
                    expectation.fulfill()
                }
                wait(for: [expectation], timeout: 2.0)
            }
            
            if attachment.hasItemConformingToTypeIdentifier("public.image") {
                let expectation = XCTestExpectation(description: "Load image")
                attachment.loadItem(forTypeIdentifier: "public.image", options: nil) { data, error in
                    if let url = data as? URL {
                        var images = result["images"] as? [String] ?? []
                        images.append(url.absoluteString)
                        result["images"] = images
                    }
                    expectation.fulfill()
                }
                wait(for: [expectation], timeout: 2.0)
            }
        }
        
        return result.isEmpty ? nil : result
    }
    
    private func removeExtensionSuffix(from bundleId: String) -> String {
        let extensionSuffixes = [".ShareExtension", ".share", ".action", ".clip"]
        var result = bundleId
        
        for suffix in extensionSuffixes {
            result = result.replacingOccurrences(of: suffix, with: "")
        }
        
        return result
    }
    
    private func createHostAppURL(bundleId: String, path: String) -> URL? {
        return URL(string: "\(bundleId)://\(path)")
    }
    
    private func createTestImage(size: CGSize = CGSize(width: 100, height: 100)) -> UIImage {
        UIGraphicsBeginImageContextWithOptions(size, false, 1.0)
        defer { UIGraphicsEndImageContext() }
        
        let context = UIGraphicsGetCurrentContext()
        context?.setFillColor(UIColor.blue.cgColor)
        context?.fill(CGRect(origin: .zero, size: size))
        
        return UIGraphicsGetImageFromCurrentImageContext() ?? UIImage()
    }
}
