import XCTest
import Foundation
@testable import ExpoTargetsStorage

/// Performance benchmarks for storage operations
/// Measures throughput, latency, and resource usage
class StoragePerformanceTests: XCTestCase {
    
    var storage: MockUserDefaults!
    let testAppGroup = "group.com.test.performance"
    
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
    
    // MARK: - Write Performance Tests
    
    func testPerformance_SmallStringWrites() {
        // Baseline: 1000 small string writes
        measure {
            for i in 0..<1000 {
                storage.set("value\(i)", forKey: "key\(i)")
            }
        }
    }
    
    func testPerformance_MediumStringWrites() {
        // Medium strings (100 chars)
        let mediumString = String(repeating: "x", count: 100)
        
        measure {
            for i in 0..<1000 {
                storage.set(mediumString, forKey: "key\(i)")
            }
        }
    }
    
    func testPerformance_LargeStringWrites() {
        // Large strings (10KB)
        let largeString = String(repeating: "x", count: 10_000)
        
        measure {
            for i in 0..<100 {
                storage.set(largeString, forKey: "key\(i)")
            }
        }
    }
    
    func testPerformance_IntegerWrites() {
        measure {
            for i in 0..<1000 {
                storage.set(i, forKey: "key\(i)")
            }
        }
    }
    
    func testPerformance_ObjectWrites() {
        let testObject: [String: Any] = [
            "name": "Test",
            "value": 42,
            "active": true,
            "items": ["a", "b", "c"]
        ]
        
        measure {
            for i in 0..<100 {
                storage.set(testObject, forKey: "key\(i)")
            }
        }
    }
    
    func testPerformance_ComplexObjectWrites() {
        let complexObject: [String: Any] = [
            "user": [
                "name": "Jane Doe",
                "age": 28,
                "preferences": [
                    "theme": "dark",
                    "notifications": true,
                    "language": "en"
                ]
            ],
            "data": Array(0..<100).map { ["id": $0, "value": "item\($0)"] }
        ]
        
        measure {
            for i in 0..<50 {
                storage.set(complexObject, forKey: "key\(i)")
            }
        }
    }
    
    // MARK: - Read Performance Tests
    
    func testPerformance_SmallStringReads() {
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
    
    func testPerformance_RandomAccessReads() {
        // Setup
        for i in 0..<1000 {
            storage.set("value\(i)", forKey: "key\(i)")
        }
        
        measure {
            for _ in 0..<1000 {
                let randomKey = Int.random(in: 0..<1000)
                _ = storage.string(forKey: "key\(randomKey)")
            }
        }
    }
    
    func testPerformance_IntegerReads() {
        // Setup
        for i in 0..<1000 {
            storage.set(i, forKey: "key\(i)")
        }
        
        measure {
            for i in 0..<1000 {
                _ = storage.integer(forKey: "key\(i)")
            }
        }
    }
    
    func testPerformance_ObjectReads() {
        // Setup
        let testObject: [String: Any] = ["name": "Test", "value": 42]
        for i in 0..<100 {
            storage.set(testObject, forKey: "key\(i)")
        }
        
        measure {
            for i in 0..<100 {
                _ = storage.object(forKey: "key\(i)") as? [String: Any]
            }
        }
    }
    
    // MARK: - Mixed Operations Performance
    
    func testPerformance_MixedReadWrite() {
        measure {
            for i in 0..<500 {
                storage.set("value\(i)", forKey: "key\(i)")
                _ = storage.string(forKey: "key\(i)")
            }
        }
    }
    
    func testPerformance_UpdateExistingValues() {
        // Setup
        for i in 0..<1000 {
            storage.set("initial\(i)", forKey: "key\(i)")
        }
        
        measure {
            for i in 0..<1000 {
                storage.set("updated\(i)", forKey: "key\(i)")
            }
        }
    }
    
    // MARK: - Bulk Operations Performance
    
    func testPerformance_GetAllKeys() {
        // Setup
        for i in 0..<1000 {
            storage.set("value\(i)", forKey: "key\(i)")
        }
        
        measure {
            _ = Array(storage.dictionaryRepresentation().keys)
        }
    }
    
    func testPerformance_GetAllData() {
        // Setup
        for i in 0..<1000 {
            storage.set("value\(i)", forKey: "key\(i)")
        }
        
        measure {
            _ = storage.dictionaryRepresentation()
        }
    }
    
    func testPerformance_BulkDelete() {
        // Setup
        for i in 0..<1000 {
            storage.set("value\(i)", forKey: "key\(i)")
        }
        
        measure {
            for i in 0..<1000 {
                storage.removeObject(forKey: "key\(i)")
            }
        }
    }
    
    func testPerformance_ClearAll() {
        // Setup
        for i in 0..<1000 {
            storage.set("value\(i)", forKey: "key\(i)")
        }
        
        measure {
            let dict = storage.dictionaryRepresentation()
            for key in dict.keys {
                storage.removeObject(forKey: key)
            }
        }
    }
    
    // MARK: - Synchronization Performance
    
    func testPerformance_SynchronizeCalls() {
        measure {
            for _ in 0..<1000 {
                _ = storage.synchronize()
            }
        }
    }
    
    func testPerformance_WriteWithSync() {
        measure {
            for i in 0..<100 {
                storage.set("value\(i)", forKey: "key\(i)")
                _ = storage.synchronize()
            }
        }
    }
    
    // MARK: - Concurrent Operations Performance
    
    func testPerformance_ConcurrentWrites() {
        measure {
            let queue = DispatchQueue(label: "test.concurrent", attributes: .concurrent)
            let group = DispatchGroup()
            
            for i in 0..<100 {
                group.enter()
                queue.async {
                    self.storage.set("value\(i)", forKey: "key\(i)")
                    group.leave()
                }
            }
            
            group.wait()
        }
    }
    
    func testPerformance_ConcurrentReads() {
        // Setup
        for i in 0..<100 {
            storage.set("value\(i)", forKey: "key\(i)")
        }
        
        measure {
            let queue = DispatchQueue(label: "test.concurrent.read", attributes: .concurrent)
            let group = DispatchGroup()
            
            for i in 0..<100 {
                group.enter()
                queue.async {
                    _ = self.storage.string(forKey: "key\(i)")
                    group.leave()
                }
            }
            
            group.wait()
        }
    }
    
    func testPerformance_ConcurrentMixedOperations() {
        measure {
            let queue = DispatchQueue(label: "test.concurrent.mixed", attributes: .concurrent)
            let group = DispatchGroup()
            
            // 50 writes, 50 reads
            for i in 0..<50 {
                group.enter()
                queue.async {
                    self.storage.set("value\(i)", forKey: "key\(i)")
                    group.leave()
                }
                
                group.enter()
                queue.async {
                    _ = self.storage.string(forKey: "key\(i)")
                    group.leave()
                }
            }
            
            group.wait()
        }
    }
    
    // MARK: - Memory Performance Tests
    
    func testPerformance_LargeDatasetMemory() {
        // Test memory efficiency with large dataset
        measure {
            // Store 10,000 small items
            for i in 0..<10_000 {
                storage.set("value\(i)", forKey: "key\(i)")
            }
            
            // Read them all
            for i in 0..<10_000 {
                _ = storage.string(forKey: "key\(i)")
            }
            
            // Clear them all
            let dict = storage.dictionaryRepresentation()
            for key in dict.keys {
                storage.removeObject(forKey: key)
            }
        }
    }
    
    // MARK: - Real-World Scenario Performance
    
    func testPerformance_TypicalWidgetUpdateCycle() {
        // Simulate typical widget update: read old data, write new data, sync
        measure {
            for i in 0..<100 {
                // Read current data
                _ = storage.string(forKey: "temperature")
                _ = storage.string(forKey: "condition")
                _ = storage.integer(forKey: "humidity")
                
                // Write new data
                storage.set("72", forKey: "temperature")
                storage.set("Sunny", forKey: "condition")
                storage.set(65, forKey: "humidity")
                
                // Sync
                _ = storage.synchronize()
            }
        }
    }
    
    func testPerformance_HighFrequencyUpdates() {
        // Simulate high-frequency updates (e.g., live activity)
        measure {
            for i in 0..<1000 {
                storage.set("Update \(i)", forKey: "liveData")
                _ = storage.synchronize()
            }
        }
    }
    
    // MARK: - Stress Tests
    
    func testStress_MassiveWriteLoad() {
        // Write 100,000 small items
        let startTime = Date()
        
        for i in 0..<100_000 {
            storage.set("value\(i)", forKey: "key\(i)")
            
            // Sync every 1000 items
            if i % 1000 == 0 {
                _ = storage.synchronize()
            }
        }
        
        let duration = Date().timeIntervalSince(startTime)
        let throughput = 100_000.0 / duration
        
        print("Massive write throughput: \(Int(throughput)) writes/second")
        XCTAssertLessThan(duration, 60.0, "Massive write took too long")
    }
    
    func testStress_RapidReadWrite() {
        // Rapid alternating read/write operations
        let startTime = Date()
        
        for i in 0..<10_000 {
            storage.set("value\(i)", forKey: "key")
            _ = storage.string(forKey: "key")
        }
        
        let duration = Date().timeIntervalSince(startTime)
        print("Rapid read/write duration: \(duration)s for 10,000 cycles")
        XCTAssertLessThan(duration, 10.0, "Rapid read/write took too long")
    }
    
    // MARK: - Latency Tests
    
    func testLatency_SingleWrite() {
        let iterations = 100
        var totalTime: TimeInterval = 0
        
        for i in 0..<iterations {
            let start = Date()
            storage.set("value", forKey: "key\(i)")
            totalTime += Date().timeIntervalSince(start)
        }
        
        let averageLatency = (totalTime / Double(iterations)) * 1000 // Convert to ms
        print("Average write latency: \(averageLatency)ms")
        XCTAssertLessThan(averageLatency, 1.0, "Write latency too high")
    }
    
    func testLatency_SingleRead() {
        // Setup
        for i in 0..<100 {
            storage.set("value\(i)", forKey: "key\(i)")
        }
        
        let iterations = 100
        var totalTime: TimeInterval = 0
        
        for i in 0..<iterations {
            let start = Date()
            _ = storage.string(forKey: "key\(i)")
            totalTime += Date().timeIntervalSince(start)
        }
        
        let averageLatency = (totalTime / Double(iterations)) * 1000 // Convert to ms
        print("Average read latency: \(averageLatency)ms")
        XCTAssertLessThan(averageLatency, 0.5, "Read latency too high")
    }
    
    func testLatency_SynchronizeOperation() {
        let iterations = 100
        var totalTime: TimeInterval = 0
        
        for _ in 0..<iterations {
            storage.set("value", forKey: "key")
            let start = Date()
            _ = storage.synchronize()
            totalTime += Date().timeIntervalSince(start)
        }
        
        let averageLatency = (totalTime / Double(iterations)) * 1000 // Convert to ms
        print("Average synchronize latency: \(averageLatency)ms")
        XCTAssertLessThan(averageLatency, 5.0, "Synchronize latency too high")
    }
}
