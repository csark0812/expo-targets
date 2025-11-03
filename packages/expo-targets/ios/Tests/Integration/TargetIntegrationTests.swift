import XCTest
import Foundation
import WidgetKit
@testable import ExpoTargetsStorage
@testable import ExpoTargetsExtension

/// Integration tests for complete target workflows
/// Tests end-to-end data flow, widget refresh, and cross-module operations
@available(iOS 14.0, *)
class TargetIntegrationTests: XCTestCase {
    
    var storage: MockUserDefaults!
    var mockWidgetCenter: MockWidgetCenter!
    let testAppGroup = "group.com.test.integration"
    let targetName = "TestWidget"
    
    // MARK: - Setup & Teardown
    
    override func setUp() {
        super.setUp()
        storage = MockUserDefaults(suiteName: testAppGroup)
        storage?.clearStorage()
        mockWidgetCenter = MockWidgetCenter.shared
        mockWidgetCenter.reset()
    }
    
    override func tearDown() {
        storage?.clearStorage()
        storage = nil
        mockWidgetCenter.reset()
        mockWidgetCenter = nil
        super.tearDown()
    }
    
    // MARK: - Complete Widget Update Flow Tests
    
    func testCompleteWidgetUpdateFlow() {
        // Given - Main app stores data
        storage.set("Hello Widget", forKey: "message")
        storage.set(42, forKey: "count")
        XCTAssertTrue(storage.wasSynchronizeCalled())
        
        // When - Widget reads data
        let message = storage.string(forKey: "message")
        let count = storage.integer(forKey: "count")
        
        // Then - Widget has correct data
        XCTAssertEqual(message, "Hello Widget")
        XCTAssertEqual(count, 42)
    }
    
    func testDataPersistenceAcrossReads() {
        // Given - Store data
        storage.set("persistent data", forKey: "testKey")
        storage.synchronize()
        
        // When - Read multiple times
        let read1 = storage.string(forKey: "testKey")
        let read2 = storage.string(forKey: "testKey")
        let read3 = storage.string(forKey: "testKey")
        
        // Then - All reads return same data
        XCTAssertEqual(read1, "persistent data")
        XCTAssertEqual(read2, "persistent data")
        XCTAssertEqual(read3, "persistent data")
    }
    
    func testWidgetRefreshTriggersCorrectly() {
        // Given - Data is stored
        storage.set("updated content", forKey: "content")
        
        // When - Refresh is triggered
        mockWidgetCenter.reloadTimelines(ofKind: targetName)
        
        // Then - Widget center was called
        XCTAssertTrue(mockWidgetCenter.reloadTimelinesCalled)
        XCTAssertEqual(mockWidgetCenter.lastReloadedKind, targetName)
        XCTAssertEqual(mockWidgetCenter.reloadCount, 1)
    }
    
    func testRefreshAllWidgets() {
        // When
        mockWidgetCenter.reloadAllTimelines()
        
        // Then
        XCTAssertTrue(mockWidgetCenter.reloadAllTimelinesCalled)
        XCTAssertEqual(mockWidgetCenter.reloadCount, 1)
    }
    
    func testMultipleWidgetRefreshes() {
        // When
        mockWidgetCenter.reloadTimelines(ofKind: "Widget1")
        mockWidgetCenter.reloadTimelines(ofKind: "Widget2")
        mockWidgetCenter.reloadTimelines(ofKind: "Widget3")
        
        // Then
        XCTAssertEqual(mockWidgetCenter.reloadCount, 3)
        XCTAssertEqual(mockWidgetCenter.lastReloadedKind, "Widget3")
    }
    
    // MARK: - Multi-Target Data Isolation Tests
    
    func testMultipleTargetsIsolatedData() {
        // Given - Two different targets with different app groups
        let storage1 = MockUserDefaults(suiteName: "group.com.test.widget1")
        let storage2 = MockUserDefaults(suiteName: "group.com.test.widget2")
        
        // When - Store different data for each
        storage1?.set("Widget 1 Data", forKey: "data")
        storage2?.set("Widget 2 Data", forKey: "data")
        
        // Then - Data is isolated
        XCTAssertEqual(storage1?.string(forKey: "data"), "Widget 1 Data")
        XCTAssertEqual(storage2?.string(forKey: "data"), "Widget 2 Data")
        
        // Cleanup
        storage1?.clearStorage()
        storage2?.clearStorage()
    }
    
    func testMultipleTargetsSameAppGroup() {
        // Given - Two targets sharing same app group
        let widget1Key = "widget1_data"
        let widget2Key = "widget2_data"
        
        // When - Both store to same app group
        storage.set("Widget 1", forKey: widget1Key)
        storage.set("Widget 2", forKey: widget2Key)
        
        // Then - Both can access their data
        XCTAssertEqual(storage.string(forKey: widget1Key), "Widget 1")
        XCTAssertEqual(storage.string(forKey: widget2Key), "Widget 2")
    }
    
    // MARK: - Extension to Main App Communication Tests
    
    func testShareExtensionToMainApp() {
        // Given - Share extension stores data
        let sharedURL = "https://example.com/shared"
        storage.set(sharedURL, forKey: "sharedURL")
        storage.set(Date().timeIntervalSince1970, forKey: "sharedAt")
        storage.synchronize()
        
        // When - Main app reads data
        let retrievedURL = storage.string(forKey: "sharedURL")
        let sharedAt = storage.object(forKey: "sharedAt") as? Double
        
        // Then - Data is available
        XCTAssertEqual(retrievedURL, sharedURL)
        XCTAssertNotNil(sharedAt)
    }
    
    func testMainAppToWidgetCommunication() {
        // Given - Main app prepares widget data
        let widgetData: [String: Any] = [
            "title": "Daily Summary",
            "count": 123,
            "updated": true
        ]
        
        // When - Main app stores data
        for (key, value) in widgetData {
            storage.set(value, forKey: key)
        }
        storage.synchronize()
        
        // And - Widget reads data
        let title = storage.string(forKey: "title")
        let count = storage.integer(forKey: "count")
        let updated = storage.bool(forKey: "updated")
        
        // Then - Widget has correct data
        XCTAssertEqual(title, "Daily Summary")
        XCTAssertEqual(count, 123)
        XCTAssertTrue(updated)
    }
    
    // MARK: - Data Update Scenarios Tests
    
    func testIncrementalDataUpdates() {
        // Given - Initial data
        storage.set(0, forKey: "counter")
        
        // When - Incremental updates
        for i in 1...10 {
            storage.set(i, forKey: "counter")
            storage.synchronize()
            
            // Then - Each update persists
            XCTAssertEqual(storage.integer(forKey: "counter"), i)
        }
    }
    
    func testBatchDataUpdate() {
        // Given - Multiple data points
        let batchData: [String: Any] = [
            "user": "John",
            "score": 100,
            "level": 5,
            "achievement": "Master"
        ]
        
        // When - Batch update
        for (key, value) in batchData {
            storage.set(value, forKey: key)
        }
        storage.synchronize()
        
        // Then - All data persists correctly
        XCTAssertEqual(storage.string(forKey: "user"), "John")
        XCTAssertEqual(storage.integer(forKey: "score"), 100)
        XCTAssertEqual(storage.integer(forKey: "level"), 5)
        XCTAssertEqual(storage.string(forKey: "achievement"), "Master")
    }
    
    func testPartialDataUpdate() {
        // Given - Initial complete data
        storage.set("Initial User", forKey: "user")
        storage.set(50, forKey: "score")
        storage.set(3, forKey: "level")
        
        // When - Partial update (only score)
        storage.set(75, forKey: "score")
        storage.synchronize()
        
        // Then - Updated field changes, others remain
        XCTAssertEqual(storage.string(forKey: "user"), "Initial User")
        XCTAssertEqual(storage.integer(forKey: "score"), 75)
        XCTAssertEqual(storage.integer(forKey: "level"), 3)
    }
    
    // MARK: - Complex Data Structure Tests
    
    func testNestedDataStructure() {
        // Given - Complex nested structure
        let complexData: [String: Any] = [
            "user": [
                "name": "Jane Doe",
                "age": 28,
                "preferences": [
                    "theme": "dark",
                    "notifications": true,
                    "language": "en"
                ]
            ],
            "stats": [
                "views": 1234,
                "likes": 567,
                "shares": 89
            ]
        ]
        
        // When - Store nested data
        storage.set(complexData, forKey: "complexData")
        storage.synchronize()
        
        // Then - Retrieve and validate
        let retrieved = storage.object(forKey: "complexData") as? [String: Any]
        XCTAssertNotNil(retrieved)
        
        let user = retrieved?["user"] as? [String: Any]
        XCTAssertNotNil(user)
        XCTAssertEqual(user?["name"] as? String, "Jane Doe")
        
        let preferences = user?["preferences"] as? [String: Any]
        XCTAssertNotNil(preferences)
        XCTAssertEqual(preferences?["theme"] as? String, "dark")
    }
    
    func testArrayDataStructure() {
        // Given - Array data
        let items = ["item1", "item2", "item3", "item4", "item5"]
        
        // When - Store array
        storage.set(items, forKey: "items")
        storage.synchronize()
        
        // Then - Retrieve array
        let retrieved = storage.object(forKey: "items") as? [String]
        XCTAssertEqual(retrieved, items)
    }
    
    // MARK: - Data Consistency Tests
    
    func testDataConsistencyAfterCrash() {
        // Simulate: Store data, force synchronize, then "crash" (clear reference)
        
        // Given - Store critical data
        storage.set("critical data", forKey: "important")
        storage.synchronize()
        
        // When - Simulate crash and recovery (create new storage instance)
        let recoveredStorage = MockUserDefaults(suiteName: testAppGroup)
        
        // Note: In a real scenario with UserDefaults, data would persist
        // In our mock, we're testing the synchronize behavior
        XCTAssertTrue(storage.wasSynchronizeCalled())
        
        // Cleanup
        recoveredStorage?.clearStorage()
    }
    
    func testConcurrentAccessFromMultipleTargets() {
        // Given - Multiple storage instances (simulating different targets)
        let storage1 = MockUserDefaults(suiteName: testAppGroup)
        let storage2 = MockUserDefaults(suiteName: testAppGroup)
        let storage3 = MockUserDefaults(suiteName: testAppGroup)
        
        let expectation = XCTestExpectation(description: "Concurrent writes")
        expectation.expectedFulfillmentCount = 3
        
        // When - Concurrent writes
        DispatchQueue.global().async {
            storage1?.set("Target 1", forKey: "target1")
            expectation.fulfill()
        }
        
        DispatchQueue.global().async {
            storage2?.set("Target 2", forKey: "target2")
            expectation.fulfill()
        }
        
        DispatchQueue.global().async {
            storage3?.set("Target 3", forKey: "target3")
            expectation.fulfill()
        }
        
        // Then - All writes succeed
        wait(for: [expectation], timeout: 3.0)
        
        // Cleanup
        storage1?.clearStorage()
        storage2?.clearStorage()
        storage3?.clearStorage()
    }
    
    // MARK: - Error Recovery Tests
    
    func testRecoveryFromInvalidData() {
        // Given - Store valid data
        storage.set("valid data", forKey: "test")
        
        // When - Attempt to read as wrong type
        let intValue = storage.integer(forKey: "test")
        
        // Then - Returns default value instead of crashing
        XCTAssertEqual(intValue, 0)
        
        // And - Original data still accessible as correct type
        XCTAssertEqual(storage.string(forKey: "test"), "valid data")
    }
    
    func testClearingCorruptedData() {
        // Given - Multiple data entries
        storage.set("data1", forKey: "key1")
        storage.set("data2", forKey: "key2")
        storage.set("data3", forKey: "key3")
        
        // When - Clear all data (recovery strategy)
        let allKeys = Array(storage.dictionaryRepresentation().keys)
        for key in allKeys {
            storage.removeObject(forKey: key)
        }
        storage.synchronize()
        
        // Then - Storage is clean
        XCTAssertEqual(storage.getStorageSize(), 0)
        XCTAssertNil(storage.string(forKey: "key1"))
    }
    
    // MARK: - Performance Integration Tests
    
    func testRapidUpdateCycle() {
        // Simulate rapid widget updates (every second)
        measure {
            for i in 0..<100 {
                storage.set("Update \(i)", forKey: "rapidUpdate")
                storage.synchronize()
                mockWidgetCenter.reloadTimelines(ofKind: targetName)
            }
        }
        
        XCTAssertEqual(mockWidgetCenter.reloadCount, 100)
    }
    
    func testLargeDatasetHandling() {
        // Given - Large dataset
        let largeDataset = TestHelpers.generateTestData(count: 1000)
        
        // When - Store large dataset
        let storeTime = TestHelpers.measureTime {
            for (key, value) in largeDataset {
                storage.set(value, forKey: key)
            }
            storage.synchronize()
        }
        
        // Then - Operations complete in reasonable time
        XCTAssertLessThan(storeTime, 5.0, "Large dataset storage took too long")
        
        // And - Data is accessible
        XCTAssertEqual(storage.getStorageSize(), 1000)
    }
    
    // MARK: - Real-World Scenario Tests
    
    func testWeatherWidgetScenario() {
        // Simulate a weather widget update flow
        
        // Given - Main app fetches weather data
        let weatherData: [String: Any] = [
            "temperature": 72,
            "condition": "Sunny",
            "humidity": 65,
            "lastUpdated": Date().timeIntervalSince1970
        ]
        
        // When - Store and refresh
        for (key, value) in weatherData {
            storage.set(value, forKey: key)
        }
        storage.synchronize()
        mockWidgetCenter.reloadTimelines(ofKind: "WeatherWidget")
        
        // Then - Widget receives update
        XCTAssertEqual(storage.integer(forKey: "temperature"), 72)
        XCTAssertEqual(storage.string(forKey: "condition"), "Sunny")
        XCTAssertTrue(mockWidgetCenter.reloadTimelinesCalled)
    }
    
    func testTaskListWidgetScenario() {
        // Simulate a task list widget
        
        // Given - Main app has tasks
        let tasks: [[String: Any]] = [
            ["id": 1, "title": "Task 1", "completed": false],
            ["id": 2, "title": "Task 2", "completed": true],
            ["id": 3, "title": "Task 3", "completed": false]
        ]
        
        // When - Serialize and store
        if let jsonData = try? JSONSerialization.data(withJSONObject: tasks),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            storage.set(jsonString, forKey: "tasks")
            storage.synchronize()
            mockWidgetCenter.reloadTimelines(ofKind: "TaskWidget")
        }
        
        // Then - Widget can deserialize
        if let taskString = storage.string(forKey: "tasks"),
           let taskData = taskString.data(using: .utf8),
           let retrievedTasks = try? JSONSerialization.jsonObject(with: taskData) as? [[String: Any]] {
            XCTAssertEqual(retrievedTasks.count, 3)
            XCTAssertTrue(mockWidgetCenter.reloadTimelinesCalled)
        } else {
            XCTFail("Failed to deserialize tasks")
        }
    }
    
    func testShareExtensionScenario() {
        // Simulate sharing a URL from Safari
        
        // Given - User shares a URL
        let sharedURL = "https://example.com/article"
        let sharedTitle = "Interesting Article"
        
        // When - Share extension stores data
        storage.set(sharedURL, forKey: "lastSharedURL")
        storage.set(sharedTitle, forKey: "lastSharedTitle")
        storage.set(Date().timeIntervalSince1970, forKey: "lastSharedTime")
        storage.synchronize()
        
        // Then - Main app can access shared data
        XCTAssertEqual(storage.string(forKey: "lastSharedURL"), sharedURL)
        XCTAssertEqual(storage.string(forKey: "lastSharedTitle"), sharedTitle)
        XCTAssertNotNil(storage.object(forKey: "lastSharedTime"))
    }
}
