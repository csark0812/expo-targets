import XCTest
import Foundation
import UIKit

/// Tests for share extension data loading template functionality
class ShareExtensionTemplateTests: XCTestCase {
    
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
    
    // MARK: - Async Content Loading Tests
    
    func testAsyncLoadTextContent() async {
        // Given
        mockContext.addMockTextItem("Test content")
        
        // When
        let result = await loadSharedContent(from: mockContext)
        
        // Then
        XCTAssertNotNil(result)
        XCTAssertEqual(result?["text"] as? String, "Test content")
    }
    
    func testAsyncLoadURLContent() async {
        // Given
        let testURL = URL(string: "https://example.com")!
        mockContext.addMockURLItem(testURL)
        
        // When
        let result = await loadSharedContent(from: mockContext)
        
        // Then
        XCTAssertNotNil(result)
        XCTAssertEqual(result?["url"] as? String, testURL.absoluteString)
    }
    
    func testAsyncLoadImageContent() async {
        // Given
        mockContext.addMockImageItem(createTestImage())
        
        // When
        let result = await loadSharedContent(from: mockContext)
        
        // Then
        XCTAssertNotNil(result)
        let images = result?["images"] as? [String]
        XCTAssertNotNil(images)
        XCTAssertGreaterThan(images?.count ?? 0, 0)
    }
    
    func testAsyncLoadMultipleAttachments() async {
        // Given
        mockContext.addMockTextItem("Sample text")
        mockContext.addMockURLItem(URL(string: "https://example.com")!)
        mockContext.addMockImageItem(createTestImage())
        
        // When
        let result = await loadSharedContent(from: mockContext)
        
        // Then
        XCTAssertNotNil(result)
        XCTAssertNotNil(result?["text"])
        XCTAssertNotNil(result?["url"])
        XCTAssertNotNil(result?["images"])
    }
    
    // MARK: - Image Processing Tests
    
    func testImageToPNGConversion() {
        // Given
        let testImage = createTestImage(color: .red)
        
        // When
        guard let pngData = testImage.pngData() else {
            XCTFail("Failed to convert image to PNG")
            return
        }
        
        // Then
        XCTAssertGreaterThan(pngData.count, 0)
        
        // Verify it can be loaded back
        let loadedImage = UIImage(data: pngData)
        XCTAssertNotNil(loadedImage)
    }
    
    func testImageTemporaryFileStorage() {
        // Given
        let testImage = createTestImage()
        guard let pngData = testImage.pngData() else {
            XCTFail("Failed to convert image to PNG")
            return
        }
        
        // When
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString + ".png")
        
        do {
            try pngData.write(to: tempURL)
            
            // Then
            XCTAssertTrue(FileManager.default.fileExists(atPath: tempURL.path))
            
            // Cleanup
            try? FileManager.default.removeItem(at: tempURL)
        } catch {
            XCTFail("Failed to write image: \(error)")
        }
    }
    
    func testMultipleImageProcessing() {
        // Given
        let images = [
            createTestImage(color: .red),
            createTestImage(color: .green),
            createTestImage(color: .blue)
        ]
        
        // When
        var imageURLs: [String] = []
        for image in images {
            if let pngData = image.pngData() {
                let tempURL = FileManager.default.temporaryDirectory
                    .appendingPathComponent(UUID().uuidString + ".png")
                try? pngData.write(to: tempURL)
                imageURLs.append(tempURL.absoluteString)
            }
        }
        
        // Then
        XCTAssertEqual(imageURLs.count, 3)
        
        // Cleanup
        for urlString in imageURLs {
            if let url = URL(string: urlString) {
                try? FileManager.default.removeItem(at: url)
            }
        }
    }
    
    // MARK: - Attachment Item Loading Tests
    
    func testLoadAttachmentItem_Text() async {
        // Given
        let attachment = NSItemProvider(item: "Test text" as NSString, typeIdentifier: "public.plain-text")
        
        // When
        let result = await loadAttachmentItem(attachment, typeIdentifier: "public.plain-text")
        
        // Then
        XCTAssertNotNil(result)
        XCTAssertTrue(result is String)
        XCTAssertEqual(result as? String, "Test text")
    }
    
    func testLoadAttachmentItem_URL() async {
        // Given
        let testURL = URL(string: "https://example.com")!
        let attachment = NSItemProvider(item: testURL as NSURL, typeIdentifier: "public.url")
        
        // When
        let result = await loadAttachmentItem(attachment, typeIdentifier: "public.url")
        
        // Then
        XCTAssertNotNil(result)
        XCTAssertTrue(result is URL)
        XCTAssertEqual((result as? URL)?.absoluteString, testURL.absoluteString)
    }
    
    func testLoadAttachmentItem_InvalidType() async {
        // Given
        let attachment = NSItemProvider(item: "Text" as NSString, typeIdentifier: "public.plain-text")
        
        // When - Try to load as wrong type
        let result = await loadAttachmentItem(attachment, typeIdentifier: "public.image")
        
        // Then
        XCTAssertNil(result)
    }
    
    // MARK: - Shared Data Props Tests
    
    func testGetSharedDataProps_EmptyData() {
        // Given
        let sharedText: String? = nil
        let sharedURL: String? = nil
        let sharedImages: [String] = []
        let sharedFiles: [String] = []
        
        // When
        let props = createSharedDataProps(
            text: sharedText,
            url: sharedURL,
            images: sharedImages,
            files: sharedFiles
        )
        
        // Then
        XCTAssertTrue(props.isEmpty)
    }
    
    func testGetSharedDataProps_WithText() {
        // Given
        let sharedText = "Sample text"
        
        // When
        let props = createSharedDataProps(
            text: sharedText,
            url: nil,
            images: [],
            files: []
        )
        
        // Then
        XCTAssertEqual(props.count, 1)
        XCTAssertEqual(props["text"] as? String, sharedText)
    }
    
    func testGetSharedDataProps_WithURL() {
        // Given
        let sharedURL = "https://example.com"
        
        // When
        let props = createSharedDataProps(
            text: nil,
            url: sharedURL,
            images: [],
            files: []
        )
        
        // Then
        XCTAssertEqual(props.count, 1)
        XCTAssertEqual(props["url"] as? String, sharedURL)
    }
    
    func testGetSharedDataProps_WithImages() {
        // Given
        let images = ["file:///tmp/image1.png", "file:///tmp/image2.png"]
        
        // When
        let props = createSharedDataProps(
            text: nil,
            url: nil,
            images: images,
            files: []
        )
        
        // Then
        XCTAssertEqual(props.count, 1)
        let resultImages = props["images"] as? [String]
        XCTAssertEqual(resultImages, images)
    }
    
    func testGetSharedDataProps_WithAllData() {
        // Given
        let text = "Text"
        let url = "https://example.com"
        let images = ["image1.png"]
        let files = ["file1.pdf"]
        
        // When
        let props = createSharedDataProps(
            text: text,
            url: url,
            images: images,
            files: files
        )
        
        // Then
        XCTAssertEqual(props.count, 4)
        XCTAssertEqual(props["text"] as? String, text)
        XCTAssertEqual(props["url"] as? String, url)
        XCTAssertEqual(props["images"] as? [String], images)
        XCTAssertEqual(props["files"] as? [String], files)
    }
    
    // MARK: - Error Handling Tests
    
    func testHandleLoadingError() async {
        // Given - Empty context
        
        // When
        let result = await loadSharedContent(from: mockContext)
        
        // Then - Should return nil gracefully
        XCTAssertNil(result)
    }
    
    func testHandleCorruptedAttachment() async {
        // Given - Mock context with no actual data
        let item = NSExtensionItem()
        item.attachments = []
        mockContext.mockInputItems = [item]
        
        // When
        let result = await loadSharedContent(from: mockContext)
        
        // Then
        XCTAssertNil(result)
    }
    
    // MARK: - Performance Tests
    
    func testPerformance_LoadMultipleAttachments() async {
        // Given
        mockContext.addMockTextItem("Text 1")
        mockContext.addMockTextItem("Text 2")
        mockContext.addMockURLItem(URL(string: "https://example1.com")!)
        mockContext.addMockURLItem(URL(string: "https://example2.com")!)
        
        // Measure
        let startTime = Date()
        _ = await loadSharedContent(from: mockContext)
        let duration = Date().timeIntervalSince(startTime)
        
        print("Load multiple attachments duration: \(duration)s")
        XCTAssertLessThan(duration, 2.0, "Loading took too long")
    }
    
    // MARK: - Helper Methods
    
    private func loadSharedContent(from context: MockExtensionContext) async -> [String: Any]? {
        guard let extensionItem = context.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments else {
            return nil
        }
        
        var result: [String: Any] = [:]
        
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier("public.plain-text") {
                if let data = await loadAttachmentItem(attachment, typeIdentifier: "public.plain-text") as? String {
                    result["text"] = data
                }
            }
            
            if attachment.hasItemConformingToTypeIdentifier("public.url") {
                if let url = await loadAttachmentItem(attachment, typeIdentifier: "public.url") as? URL {
                    result["url"] = url.absoluteString
                }
            }
            
            if attachment.hasItemConformingToTypeIdentifier("public.image") {
                if let url = await loadAttachmentItem(attachment, typeIdentifier: "public.image") as? URL {
                    var images = result["images"] as? [String] ?? []
                    images.append(url.absoluteString)
                    result["images"] = images
                }
            }
        }
        
        return result.isEmpty ? nil : result
    }
    
    private func loadAttachmentItem(_ attachment: NSItemProvider, typeIdentifier: String) async -> NSSecureCoding? {
        return await withCheckedContinuation { continuation in
            attachment.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { data, error in
                if error != nil {
                    continuation.resume(returning: nil)
                } else {
                    continuation.resume(returning: data)
                }
            }
        }
    }
    
    private func createSharedDataProps(
        text: String?,
        url: String?,
        images: [String],
        files: [String]
    ) -> [String: Any] {
        var data: [String: Any] = [:]
        
        if let text = text {
            data["text"] = text
        }
        
        if let url = url {
            data["url"] = url
        }
        
        if !images.isEmpty {
            data["images"] = images
        }
        
        if !files.isEmpty {
            data["files"] = files
        }
        
        return data
    }
    
    private func createTestImage(
        size: CGSize = CGSize(width: 100, height: 100),
        color: UIColor = .blue
    ) -> UIImage {
        UIGraphicsBeginImageContextWithOptions(size, false, 1.0)
        defer { UIGraphicsEndImageContext() }
        
        let context = UIGraphicsGetCurrentContext()
        context?.setFillColor(color.cgColor)
        context?.fill(CGRect(origin: .zero, size: size))
        
        return UIGraphicsGetImageFromCurrentImageContext() ?? UIImage()
    }
}
