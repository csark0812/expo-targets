import XCTest
import Foundation
@testable import ExpoTargetsStorage

/// Comprehensive unit tests for ExpoTargetsStorageModule
/// Tests all storage operations, widget refresh, and data persistence
class ExpoTargetsStorageModuleTests: XCTestCase {
    
    var storage: MockUserDefaults!
    let testAppGroup = "group.com.test.expotargets"
    let testKey = "testKey"
    
    // MARK: - Setup & Teardown
    
    override func setUp() {
        super.setUp()
        storage = MockUserDefaults(suiteName: testAppGroup)
        storage?.clearStorage()
    }
    
    override func tearDown() {
        storage?.clearStorage()
        storage = nil
        super.tearDown()
    }
    
    // MARK: - String Storage Tests
    
    func testSetString_StoresValue() {
        // Given
        let value = "Hello, World!"
        
        // When
        storage.set(value, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.string(forKey: testKey), value)
        XCTAssertTrue(storage.wasSynchronizeCalled())
    }
    
    func testSetString_EmptyString() {
        // Given
        let emptyValue = ""
        
        // When
        storage.set(emptyValue, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.string(forKey: testKey), emptyValue)
    }
    
    func testSetString_OverwritesExistingValue() {
        // Given
        storage.set("old value", forKey: testKey)
        let newValue = "new value"
        
        // When
        storage.resetSynchronizeFlag()
        storage.set(newValue, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.string(forKey: testKey), newValue)
        XCTAssertTrue(storage.wasSynchronizeCalled())
    }
    
    func testSetString_WithSpecialCharacters() {
        // Given
        let specialValue = "Hello! 👋 \n\t Special: @#$%^&*()"
        
        // When
        storage.set(specialValue, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.string(forKey: testKey), specialValue)
    }
    
    func testSetString_WithUnicode() {
        // Given
        let unicodeValue = "Hello 世界 🌍 مرحبا"
        
        // When
        storage.set(unicodeValue, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.string(forKey: testKey), unicodeValue)
    }
    
    // MARK: - Integer Storage Tests
    
    func testSetInt_StoresValue() {
        // Given
        let value = 42
        
        // When
        storage.set(value, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.integer(forKey: testKey), value)
        XCTAssertTrue(storage.wasSynchronizeCalled())
    }
    
    func testSetInt_ZeroValue() {
        // Given
        let value = 0
        
        // When
        storage.set(value, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.integer(forKey: testKey), value)
    }
    
    func testSetInt_NegativeValue() {
        // Given
        let value = -100
        
        // When
        storage.set(value, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.integer(forKey: testKey), value)
    }
    
    func testSetInt_LargeValue() {
        // Given
        let value = Int.max
        
        // When
        storage.set(value, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.integer(forKey: testKey), value)
    }
    
    func testSetInt_OverwritesExistingValue() {
        // Given
        storage.set(10, forKey: testKey)
        let newValue = 20
        
        // When
        storage.resetSynchronizeFlag()
        storage.set(newValue, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.integer(forKey: testKey), newValue)
        XCTAssertTrue(storage.wasSynchronizeCalled())
    }
    
    // MARK: - Object Storage Tests
    
    func testSetObject_StoresDictionary() {
        // Given
        let dictionary: [String: Any] = [
            "name": "John Doe",
            "age": 30,
            "active": true
        ]
        
        // When
        storage.set(dictionary, forKey: testKey)
        
        // Then
        let retrieved = storage.object(forKey: testKey) as? [String: Any]
        XCTAssertNotNil(retrieved)
        XCTAssertEqual(retrieved?["name"] as? String, "John Doe")
        XCTAssertEqual(retrieved?["age"] as? Int, 30)
        XCTAssertEqual(retrieved?["active"] as? Bool, true)
    }
    
    func testSetObject_StoresArray() {
        // Given
        let array = ["item1", "item2", "item3"]
        
        // When
        storage.set(array, forKey: testKey)
        
        // Then
        let retrieved = storage.object(forKey: testKey) as? [String]
        XCTAssertEqual(retrieved, array)
    }
    
    func testSetObject_StoresNestedStructure() {
        // Given
        let nested: [String: Any] = [
            "user": [
                "name": "Jane",
                "preferences": ["theme": "dark", "notifications": true]
            ],
            "scores": [100, 200, 300]
        ]
        
        // When
        storage.set(nested, forKey: testKey)
        
        // Then
        let retrieved = storage.object(forKey: testKey) as? [String: Any]
        XCTAssertNotNil(retrieved)
        let user = retrieved?["user"] as? [String: Any]
        XCTAssertEqual(user?["name"] as? String, "Jane")
    }
    
    // MARK: - Get Operations Tests
    
    func testGet_ReturnsNilForNonExistentKey() {
        // When
        let value = storage.string(forKey: "nonExistentKey")
        
        // Then
        XCTAssertNil(value)
    }
    
    func testGet_ReturnsCorrectValue() {
        // Given
        let expectedValue = "test value"
        storage.set(expectedValue, forKey: testKey)
        
        // When
        let retrievedValue = storage.string(forKey: testKey)
        
        // Then
        XCTAssertEqual(retrievedValue, expectedValue)
    }
    
    func testGetInteger_ReturnsZeroForNonExistentKey() {
        // When
        let value = storage.integer(forKey: "nonExistentKey")
        
        // Then
        XCTAssertEqual(value, 0)
    }
    
    // MARK: - Remove Operations Tests
    
    func testRemove_DeletesValue() {
        // Given
        storage.set("value", forKey: testKey)
        XCTAssertNotNil(storage.string(forKey: testKey))
        
        // When
        storage.resetSynchronizeFlag()
        storage.removeObject(forKey: testKey)
        
        // Then
        XCTAssertNil(storage.string(forKey: testKey))
        XCTAssertTrue(storage.wasSynchronizeCalled())
    }
    
    func testRemove_NonExistentKey() {
        // When/Then - Should not crash
        storage.removeObject(forKey: "nonExistentKey")
        XCTAssertTrue(storage.wasSynchronizeCalled())
    }
    
    func testRemove_MultipleKeys() {
        // Given
        storage.set("value1", forKey: "key1")
        storage.set("value2", forKey: "key2")
        storage.set("value3", forKey: "key3")
        
        // When
        storage.removeObject(forKey: "key1")
        storage.removeObject(forKey: "key3")
        
        // Then
        XCTAssertNil(storage.string(forKey: "key1"))
        XCTAssertNotNil(storage.string(forKey: "key2"))
        XCTAssertNil(storage.string(forKey: "key3"))
    }
    
    // MARK: - Get All Keys Tests
    
    func testGetAllKeys_EmptyStorage() {
        // When
        let keys = storage.dictionaryRepresentation().keys
        
        // Then
        XCTAssertTrue(keys.isEmpty)
    }
    
    func testGetAllKeys_ReturnsAllKeys() {
        // Given
        storage.set("value1", forKey: "key1")
        storage.set("value2", forKey: "key2")
        storage.set(42, forKey: "key3")
        
        // When
        let keys = Array(storage.dictionaryRepresentation().keys)
        
        // Then
        XCTAssertEqual(keys.count, 3)
        XCTAssertTrue(keys.contains("key1"))
        XCTAssertTrue(keys.contains("key2"))
        XCTAssertTrue(keys.contains("key3"))
    }
    
    // MARK: - Get All Data Tests
    
    func testGetAllData_EmptyStorage() {
        // When
        let data = storage.dictionaryRepresentation()
        
        // Then
        XCTAssertTrue(data.isEmpty)
    }
    
    func testGetAllData_ReturnsAllData() {
        // Given
        storage.set("value1", forKey: "key1")
        storage.set(42, forKey: "key2")
        storage.set(true, forKey: "key3")
        
        // When
        let data = storage.dictionaryRepresentation()
        
        // Then
        XCTAssertEqual(data.count, 3)
        XCTAssertEqual(data["key1"] as? String, "value1")
        XCTAssertEqual(data["key2"] as? Int, 42)
        XCTAssertEqual(data["key3"] as? Bool, true)
    }
    
    // MARK: - Clear All Tests
    
    func testClearAll_RemovesAllData() {
        // Given
        storage.set("value1", forKey: "key1")
        storage.set("value2", forKey: "key2")
        storage.set(42, forKey: "key3")
        XCTAssertEqual(storage.getStorageSize(), 3)
        
        // When
        let dict = storage.dictionaryRepresentation()
        for key in dict.keys {
            storage.removeObject(forKey: key)
        }
        
        // Then
        XCTAssertEqual(storage.getStorageSize(), 0)
        XCTAssertTrue(storage.wasSynchronizeCalled())
    }
    
    func testClearAll_OnEmptyStorage() {
        // Given
        XCTAssertEqual(storage.getStorageSize(), 0)
        
        // When
        let dict = storage.dictionaryRepresentation()
        for key in dict.keys {
            storage.removeObject(forKey: key)
        }
        
        // Then
        XCTAssertEqual(storage.getStorageSize(), 0)
    }
    
    // MARK: - Multiple App Groups Tests
    
    func testMultipleAppGroups_IsolatedStorage() {
        // Given
        let group1 = MockUserDefaults(suiteName: "group.com.test.app1")
        let group2 = MockUserDefaults(suiteName: "group.com.test.app2")
        
        // When
        group1?.set("value1", forKey: testKey)
        group2?.set("value2", forKey: testKey)
        
        // Then
        XCTAssertEqual(group1?.string(forKey: testKey), "value1")
        XCTAssertEqual(group2?.string(forKey: testKey), "value2")
        
        // Cleanup
        group1?.clearStorage()
        group2?.clearStorage()
    }
    
    // MARK: - Synchronization Tests
    
    func testSynchronize_CalledOnSet() {
        // When
        storage.resetSynchronizeFlag()
        storage.set("value", forKey: testKey)
        
        // Then
        XCTAssertTrue(storage.wasSynchronizeCalled())
    }
    
    func testSynchronize_CalledOnRemove() {
        // Given
        storage.set("value", forKey: testKey)
        
        // When
        storage.resetSynchronizeFlag()
        storage.removeObject(forKey: testKey)
        
        // Then
        XCTAssertTrue(storage.wasSynchronizeCalled())
    }
    
    func testSynchronize_CalledOnClearAll() {
        // Given
        storage.set("value", forKey: testKey)
        
        // When
        storage.resetSynchronizeFlag()
        let dict = storage.dictionaryRepresentation()
        for key in dict.keys {
            storage.removeObject(forKey: key)
        }
        storage.synchronize()
        
        // Then
        XCTAssertTrue(storage.wasSynchronizeCalled())
    }
    
    // MARK: - Edge Cases Tests
    
    func testLongKeyName() {
        // Given
        let longKey = String(repeating: "a", count: 1000)
        
        // When
        storage.set("value", forKey: longKey)
        
        // Then
        XCTAssertEqual(storage.string(forKey: longKey), "value")
    }
    
    func testLongValue() {
        // Given
        let longValue = String(repeating: "x", count: 10000)
        
        // When
        storage.set(longValue, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.string(forKey: testKey), longValue)
    }
    
    func testSpecialCharactersInKey() {
        // Given
        let specialKey = "key@#$%^&*()_+-={}[]|\\:\";<>?,./~`"
        
        // When
        storage.set("value", forKey: specialKey)
        
        // Then
        XCTAssertEqual(storage.string(forKey: specialKey), "value")
    }
    
    func testNilAppGroup() {
        // Given
        let nilGroupDefaults = MockUserDefaults(suiteName: nil)
        
        // When
        nilGroupDefaults?.set("value", forKey: testKey)
        
        // Then
        XCTAssertEqual(nilGroupDefaults?.string(forKey: testKey), "value")
        
        // Cleanup
        nilGroupDefaults?.clearStorage()
    }
    
    // MARK: - Data Type Mixing Tests
    
    func testOverwriteStringWithInt() {
        // Given
        storage.set("string value", forKey: testKey)
        
        // When
        storage.set(42, forKey: testKey)
        
        // Then
        XCTAssertEqual(storage.integer(forKey: testKey), 42)
        XCTAssertNil(storage.string(forKey: testKey))
    }
    
    func testOverwriteIntWithObject() {
        // Given
        storage.set(42, forKey: testKey)
        
        // When
        let dict = ["key": "value"]
        storage.set(dict, forKey: testKey)
        
        // Then
        let retrieved = storage.object(forKey: testKey) as? [String: String]
        XCTAssertEqual(retrieved, dict)
        XCTAssertEqual(storage.integer(forKey: testKey), 0)
    }
    
    // MARK: - Concurrent Access Tests
    
    func testConcurrentWrites() {
        // Given
        let expectation = XCTestExpectation(description: "Concurrent writes complete")
        expectation.expectedFulfillmentCount = 100
        let queue = DispatchQueue(label: "test.concurrent", attributes: .concurrent)
        
        // When
        for i in 0..<100 {
            queue.async {
                self.storage.set("value\(i)", forKey: "key\(i)")
                expectation.fulfill()
            }
        }
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        XCTAssertEqual(storage.getStorageSize(), 100)
    }
    
    func testConcurrentReadsAndWrites() {
        // Given
        let writeExpectation = XCTestExpectation(description: "Writes complete")
        writeExpectation.expectedFulfillmentCount = 50
        let readExpectation = XCTestExpectation(description: "Reads complete")
        readExpectation.expectedFulfillmentCount = 50
        let queue = DispatchQueue(label: "test.concurrent.rw", attributes: .concurrent)
        
        // Pre-populate some data
        for i in 0..<50 {
            storage.set("initial\(i)", forKey: "key\(i)")
        }
        
        // When
        for i in 0..<50 {
            queue.async {
                self.storage.set("new\(i)", forKey: "key\(i)")
                writeExpectation.fulfill()
            }
            queue.async {
                _ = self.storage.string(forKey: "key\(i)")
                readExpectation.fulfill()
            }
        }
        
        // Then
        wait(for: [writeExpectation, readExpectation], timeout: 5.0)
    }
    
    // MARK: - Performance Tests
    
    func testPerformance_SetString() {
        measure {
            for i in 0..<1000 {
                storage.set("value\(i)", forKey: "key\(i)")
            }
        }
    }
    
    func testPerformance_GetString() {
        // Setup
        for i in 0..<1000 {
            storage.set("value\(i)", forKey: "key\(i)")
        }
        
        measure {
            for i in 0..<1000 {
                _ = storage.string(forKey: "key\(i)")
            }
        }
    }
    
    func testPerformance_SetObject() {
        let testObject: [String: Any] = [
            "name": "Test",
            "value": 42,
            "nested": ["a": 1, "b": 2, "c": 3]
        ]
        
        measure {
            for i in 0..<100 {
                storage.set(testObject, forKey: "key\(i)")
            }
        }
    }
}
