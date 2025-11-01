# Testing Guide for expo-targets iOS Implementation

This guide provides detailed information on testing strategies, patterns, and best practices for the iOS implementation of expo-targets.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Pyramid](#test-pyramid)
3. [Testing Strategies](#testing-strategies)
4. [Mock Objects](#mock-objects)
5. [Test Patterns](#test-patterns)
6. [Common Scenarios](#common-scenarios)
7. [Troubleshooting](#troubleshooting)

## Testing Philosophy

### Principles

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Fast Feedback**: Tests should run quickly to enable rapid iteration
3. **Isolation**: Each test should be independent and not affect others
4. **Readability**: Tests are documentation - make them clear and descriptive
5. **Reliability**: Tests should be deterministic and not flaky

### Goals

- ✅ 90%+ code coverage for production code
- ✅ All critical paths tested
- ✅ Performance benchmarks established
- ✅ Integration points verified
- ✅ Edge cases and error conditions covered

## Test Pyramid

```
        ╱╲
       ╱  ╲          E2E Tests (5%)
      ╱────╲         - Real device testing
     ╱      ╲        - Full integration
    ╱────────╲       
   ╱          ╲      Integration Tests (15%)
  ╱────────────╲     - Multi-module workflows
 ╱              ╲    - Data flow verification
╱────────────────╲   
│                │   Unit Tests (80%)
│  UNIT  TESTS   │   - Individual functions
│                │   - Isolated components
└────────────────┘   - Fast execution
```

### Distribution

- **Unit Tests (80%)**: Test individual components in isolation
- **Integration Tests (15%)**: Test interactions between components
- **E2E Tests (5%)**: Test complete user scenarios

## Testing Strategies

### 1. Unit Testing Strategy

**What to Test:**
- Individual functions and methods
- Data transformations
- Error handling
- Edge cases and boundary conditions

**Example:**

```swift
func testSetString_StoresValue() {
    // Given - Arrange
    let value = "Hello, World!"
    
    // When - Act
    storage.set(value, forKey: testKey)
    
    // Then - Assert
    XCTAssertEqual(storage.string(forKey: testKey), value)
    XCTAssertTrue(storage.wasSynchronizeCalled())
}
```

### 2. Integration Testing Strategy

**What to Test:**
- Data flow between modules
- Widget refresh workflows
- Extension communication
- Cross-component interactions

**Example:**

```swift
func testCompleteWidgetUpdateFlow() {
    // Given - Main app stores data
    storage.set("Hello Widget", forKey: "message")
    storage.synchronize()
    
    // When - Widget reads and refreshes
    let message = storage.string(forKey: "message")
    mockWidgetCenter.reloadTimelines(ofKind: targetName)
    
    // Then - Data flows correctly
    XCTAssertEqual(message, "Hello Widget")
    XCTAssertTrue(mockWidgetCenter.reloadTimelinesCalled)
}
```

### 3. Performance Testing Strategy

**What to Test:**
- Operation throughput
- Latency measurements
- Memory usage
- Stress conditions

**Example:**

```swift
func testPerformance_SmallStringWrites() {
    measure {
        for i in 0..<1000 {
            storage.set("value\(i)", forKey: "key\(i)")
        }
    }
}
```

## Mock Objects

### MockUserDefaults

Simulates UserDefaults without affecting real storage.

**Usage:**

```swift
let storage = MockUserDefaults(suiteName: "group.com.test.app")

// Set data
storage?.set("value", forKey: "key")

// Verify synchronization
XCTAssertTrue(storage.wasSynchronizeCalled())

// Clean up
storage?.clearStorage()
```

**Features:**
- Isolated in-memory storage
- Synchronization tracking
- Storage size inspection
- Complete cleanup

### MockExtensionContext

Simulates NSExtensionContext for extension testing.

**Usage:**

```swift
let context = MockExtensionContext()

// Add mock data
context.addMockTextItem("Sample text")
context.addMockURLItem(URL(string: "https://example.com")!)

// Verify completion
context.completeRequest(returningItems: nil)
XCTAssertTrue(context.completeRequestCalled)
```

**Features:**
- Input item management
- Completion tracking
- Item provider mocking
- State reset

### MockWidgetCenter

Simulates WidgetCenter for refresh testing.

**Usage:**

```swift
let widgetCenter = MockWidgetCenter.shared

// Trigger refresh
widgetCenter.reloadTimelines(ofKind: "TestWidget")

// Verify refresh called
XCTAssertTrue(widgetCenter.reloadTimelinesCalled)
XCTAssertEqual(widgetCenter.lastReloadedKind, "TestWidget")

// Reset for next test
widgetCenter.reset()
```

**Features:**
- Reload tracking
- Kind-specific refresh
- Call count monitoring
- State reset

## Test Patterns

### 1. Arrange-Act-Assert (AAA)

Structure tests in three clear phases:

```swift
func testExample() {
    // Arrange (Given)
    let input = "test"
    let expected = "TEST"
    
    // Act (When)
    let result = input.uppercased()
    
    // Assert (Then)
    XCTAssertEqual(result, expected)
}
```

### 2. Test Fixtures

Use setUp/tearDown for common test state:

```swift
class MyTests: XCTestCase {
    var storage: MockUserDefaults!
    
    override func setUp() {
        super.setUp()
        storage = MockUserDefaults(suiteName: "test")
        storage?.clearStorage()
    }
    
    override func tearDown() {
        storage?.clearStorage()
        storage = nil
        super.tearDown()
    }
}
```

### 3. Data-Driven Tests

Test multiple scenarios with same logic:

```swift
func testMultipleValues() {
    let testCases = [
        ("", "empty"),
        ("abc", "simple"),
        ("hello 世界", "unicode")
    ]
    
    for (input, description) in testCases {
        storage.set(input, forKey: description)
        XCTAssertEqual(storage.string(forKey: description), input)
    }
}
```

### 4. Async Testing

Handle asynchronous operations:

```swift
// Using async/await
func testAsyncOperation() async {
    let result = await fetchData()
    XCTAssertNotNil(result)
}

// Using expectations
func testAsyncWithExpectation() {
    let expectation = expectation(description: "Completes")
    
    fetchData { result in
        XCTAssertNotNil(result)
        expectation.fulfill()
    }
    
    waitForExpectations(timeout: 5.0)
}
```

### 5. Error Testing

Verify error conditions:

```swift
func testErrorHandling() {
    // Verify throws
    XCTAssertThrowsError(try riskyOperation()) { error in
        XCTAssertTrue(error is MyError)
    }
    
    // Verify returns nil
    XCTAssertNil(storage.string(forKey: "nonexistent"))
}
```

## Common Scenarios

### Testing Storage Operations

```swift
// Write and read
storage.set("value", forKey: "key")
XCTAssertEqual(storage.string(forKey: "key"), "value")

// Update existing
storage.set("new", forKey: "key")
XCTAssertEqual(storage.string(forKey: "key"), "new")

// Delete
storage.removeObject(forKey: "key")
XCTAssertNil(storage.string(forKey: "key"))

// Clear all
storage.clearStorage()
XCTAssertEqual(storage.getStorageSize(), 0)
```

### Testing Extension Data Loading

```swift
let context = MockExtensionContext()

// Add test data
context.addMockTextItem("Hello")
context.addMockURLItem(URL(string: "https://example.com")!)

// Extract data
let data = extractSharedData(from: context)

// Verify
XCTAssertEqual(data?["text"] as? String, "Hello")
XCTAssertNotNil(data?["url"])
```

### Testing Widget Refresh

```swift
// Store data
storage.set("Updated", forKey: "message")

// Trigger refresh
mockWidgetCenter.reloadTimelines(ofKind: "MyWidget")

// Verify
XCTAssertTrue(mockWidgetCenter.reloadTimelinesCalled)
XCTAssertEqual(mockWidgetCenter.lastReloadedKind, "MyWidget")
```

### Testing Concurrent Access

```swift
let expectation = expectation(description: "Concurrent access")
expectation.expectedFulfillmentCount = 10

DispatchQueue.concurrentPerform(iterations: 10) { i in
    storage.set("value\(i)", forKey: "key\(i)")
    expectation.fulfill()
}

waitForExpectations(timeout: 5.0)
XCTAssertEqual(storage.getStorageSize(), 10)
```

### Testing Performance

```swift
measure {
    for i in 0..<1000 {
        storage.set("value\(i)", forKey: "key\(i)")
    }
}

// Or manual measurement
let start = Date()
performOperation()
let duration = Date().timeIntervalSince(start)
XCTAssertLessThan(duration, 1.0)
```

## Troubleshooting

### Test Failures

#### Intermittent Failures

**Problem**: Tests pass sometimes, fail others

**Solutions**:
1. Check for timing dependencies
2. Ensure proper cleanup in tearDown
3. Avoid Date() or UUID() in assertions
4. Reset mock state between tests

```swift
override func tearDown() {
    storage?.clearStorage()
    mockWidgetCenter.reset()
    super.tearDown()
}
```

#### Memory Issues

**Problem**: Tests crash with memory warnings

**Solutions**:
1. Clean up large data structures
2. Use autoreleasepool for loops
3. Profile with Instruments

```swift
func testLargeData() {
    autoreleasepool {
        for i in 0..<100_000 {
            storage.set("value\(i)", forKey: "key\(i)")
        }
    }
}
```

#### Timeout Failures

**Problem**: Async tests timeout

**Solutions**:
1. Increase timeout duration
2. Check for unfulfilled expectations
3. Verify async operations complete

```swift
wait(for: [expectation], timeout: 10.0) // Increase timeout
```

### Performance Issues

#### Slow Tests

**Problem**: Tests take too long to run

**Solutions**:
1. Reduce iteration counts in non-performance tests
2. Use parallel test execution
3. Profile with Instruments
4. Mock expensive operations

```swift
// Instead of 1000 iterations
for i in 0..<10 { // Use smaller count for regular tests
    storage.set("value\(i)", forKey: "key\(i)")
}
```

#### Inconsistent Benchmarks

**Problem**: Performance metrics vary widely

**Solutions**:
1. Run on same hardware
2. Close other applications
3. Use multiple iterations
4. Warm up before measuring

```swift
// Warm up
for i in 0..<100 {
    storage.set("warmup", forKey: "key\(i)")
}

// Then measure
measure {
    // Actual benchmark
}
```

### Coverage Issues

#### Missing Coverage

**Problem**: Code coverage below target

**Solutions**:
1. Identify untested branches
2. Add tests for error paths
3. Test edge cases
4. Review coverage report

```bash
# Generate coverage report
xcodebuild test -enableCodeCoverage YES
xcrun llvm-cov report ...
```

## Best Practices Checklist

- [ ] Tests follow AAA pattern
- [ ] Descriptive test names (`testFeature_Scenario_ExpectedResult`)
- [ ] One assertion per test (when possible)
- [ ] Proper setup and teardown
- [ ] Mock external dependencies
- [ ] Test both success and failure paths
- [ ] Cover edge cases and boundaries
- [ ] Performance benchmarks for critical paths
- [ ] Documentation for complex tests
- [ ] No hardcoded timeouts (use constants)
- [ ] Cleanup all resources
- [ ] Tests run independently

## Resources

- [Apple XCTest Documentation](https://developer.apple.com/documentation/xctest)
- [Testing in Xcode Guide](https://developer.apple.com/library/archive/documentation/DeveloperTools/Conceptual/testing_with_xcode/)
- [Swift Testing Best Practices](https://www.swift.org/documentation/)

---

**Questions?** Open an issue or contact the maintainers.
