import Foundation
import XCTest

/// Common test utilities and helpers
public enum TestHelpers {

    /// Standard test app group identifier
    public static let testAppGroup = "group.com.test.expotargets"

    /// Generate a unique test key
    public static func uniqueKey(_ prefix: String = "test") -> String {
        return "\(prefix)_\(UUID().uuidString)"
    }

    /// Wait for async operation with timeout
    public static func waitForAsync(
        timeout: TimeInterval = 5.0,
        description: String = "Async operation",
        block: @escaping (@escaping () -> Void) -> Void
    ) -> XCTestExpectation {
        let expectation = XCTestExpectation(description: description)
        block {
            expectation.fulfill()
        }
        return expectation
    }

    /// Assert throws specific error
    public static func assertThrows<T>(
        _ expression: @autoclosure () throws -> T,
        errorType: Error.Type,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        XCTAssertThrowsError(try expression(), file: file, line: line) { error in
            XCTAssertTrue(
                type(of: error) == errorType,
                "Expected error of type \(errorType), got \(type(of: error))",
                file: file,
                line: line
            )
        }
    }

    /// Measure time of execution
    public static func measureTime(_ block: () -> Void) -> TimeInterval {
        let start = Date()
        block()
        return Date().timeIntervalSince(start)
    }

    /// Generate test data
    public static func generateTestData(count: Int) -> [String: Any] {
        var data: [String: Any] = [:]
        for i in 0..<count {
            data["key\(i)"] = "value\(i)"
        }
        return data
    }

    /// Compare dictionaries with tolerance for numeric values
    public static func assertDictionariesEqual(
        _ dict1: [String: Any],
        _ dict2: [String: Any],
        tolerance: Double = 0.0001,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        XCTAssertEqual(dict1.keys.count, dict2.keys.count, "Dictionary key counts don't match", file: file, line: line)

        for key in dict1.keys {
            XCTAssertNotNil(dict2[key], "Key '\(key)' missing in second dictionary", file: file, line: line)

            if let val1 = dict1[key] as? Double, let val2 = dict2[key] as? Double {
                XCTAssertEqual(val1, val2, accuracy: tolerance, file: file, line: line)
            } else if let val1 = dict1[key] as? String, let val2 = dict2[key] as? String {
                XCTAssertEqual(val1, val2, file: file, line: line)
            }
        }
    }
}

/// XCTest extensions for better assertions
public extension XCTestCase {

    /// Wait for multiple expectations with timeout
    func wait(for expectations: [XCTestExpectation], timeout: TimeInterval = 5.0) {
        wait(for: expectations, timeout: timeout, enforceOrder: false)
    }
}
