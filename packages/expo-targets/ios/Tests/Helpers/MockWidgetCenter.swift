import Foundation
import WidgetKit

/// Mock WidgetCenter for testing widget refresh operations
@available(iOS 14.0, *)
public class MockWidgetCenter {
    public static var shared = MockWidgetCenter()
    
    public var reloadTimelinesCalled = false
    public var reloadAllTimelinesCalled = false
    public var lastReloadedKind: String?
    public var reloadCount = 0
    
    public func reloadTimelines(ofKind kind: String) {
        reloadTimelinesCalled = true
        lastReloadedKind = kind
        reloadCount += 1
    }
    
    public func reloadAllTimelines() {
        reloadAllTimelinesCalled = true
        reloadCount += 1
    }
    
    public func getCurrentConfigurations(completion: @escaping (Result<[Any], Error>) -> Void) {
        // Mock implementation
        completion(.success([]))
    }
    
    // Test helpers
    public func reset() {
        reloadTimelinesCalled = false
        reloadAllTimelinesCalled = false
        lastReloadedKind = nil
        reloadCount = 0
    }
    
    public func wasReloadCalled(forKind kind: String) -> Bool {
        return reloadTimelinesCalled && lastReloadedKind == kind
    }
}

/// Mock ControlCenter for testing iOS 18+ control refresh
@available(iOS 18.0, *)
public class MockControlCenter {
    public static var shared = MockControlCenter()
    
    public var reloadControlsCalled = false
    public var reloadAllControlsCalled = false
    public var lastReloadedKind: String?
    public var reloadCount = 0
    
    public func reloadControls(ofKind kind: String) {
        reloadControlsCalled = true
        lastReloadedKind = kind
        reloadCount += 1
    }
    
    public func reloadAllControls() {
        reloadAllControlsCalled = true
        reloadCount += 1
    }
    
    // Test helpers
    public func reset() {
        reloadControlsCalled = false
        reloadAllControlsCalled = false
        lastReloadedKind = nil
        reloadCount = 0
    }
}
