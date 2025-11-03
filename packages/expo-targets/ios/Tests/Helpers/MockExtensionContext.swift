import Foundation
#if canImport(UIKit)
import UIKit
#endif

/// Mock NSExtensionContext for testing extension functionality
public class MockExtensionContext: NSExtensionContext {
    public var completeRequestCalled = false
    public var cancelRequestCalled = false
    public var completionItems: [Any]?
    public var mockInputItems: [NSExtensionItem] = []

    public override var inputItems: [Any] {
        get { return mockInputItems }
        set { mockInputItems = newValue as? [NSExtensionItem] ?? [] }
    }

    public override func completeRequest(returningItems items: [Any]?, completionHandler: ((Bool) -> Void)? = nil) {
        completeRequestCalled = true
        completionItems = items
        completionHandler?(true)
    }

    public override func cancelRequest(withError error: Error) {
        cancelRequestCalled = true
    }

    // Test helpers
    public func reset() {
        completeRequestCalled = false
        cancelRequestCalled = false
        completionItems = nil
        mockInputItems = []
    }

    public func addMockTextItem(_ text: String) {
        let item = NSExtensionItem()
        let itemProvider = NSItemProvider(item: text as NSString, typeIdentifier: "public.plain-text")
        item.attachments = [itemProvider]
        mockInputItems.append(item)
    }

    public func addMockURLItem(_ url: URL) {
        let item = NSExtensionItem()
        let itemProvider = NSItemProvider(item: url as NSURL, typeIdentifier: "public.url")
        item.attachments = [itemProvider]
        mockInputItems.append(item)
    }

    #if canImport(UIKit)
    public func addMockImageItem(_ image: UIImage) {
        let item = NSExtensionItem()
        let itemProvider = NSItemProvider(item: image, typeIdentifier: "public.image")
        item.attachments = [itemProvider]
        mockInputItems.append(item)
    }
    #endif
}
