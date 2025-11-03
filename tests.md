# expo-targets Test Suite

## Overview

Two test suites for expo-targets iOS implementation:

1. **Swift Unit Tests** - Native module testing at `packages/expo-targets/ios/Tests/`
2. **TypeScript Build Tests** - Build process and E2E testing at `tests/e2e/`

## Swift Unit Tests

### Structure

```
packages/expo-targets/ios/Tests/
├── Helpers/
│   ├── MockUserDefaults.swift
│   ├── MockExtensionContext.swift
│   ├── MockWidgetCenter.swift
│   └── TestHelpers.swift
├── Unit/
│   ├── Storage/ExpoTargetsStorageModuleTests.swift
│   ├── Extension/ExpoTargetsExtensionModuleTests.swift
│   └── Template/ShareExtensionTemplateTests.swift
├── Integration/TargetIntegrationTests.swift
└── Performance/StoragePerformanceTests.swift
```

### Coverage

**Storage Module** (100+ tests)

- String, integer, object storage
- CRUD operations
- App Group isolation
- Synchronization
- Concurrent access

**Extension Module** (50+ tests)

- Extension lifecycle
- Data extraction (text, URLs, images)
- Host app communication
- Error handling

**Integration** (40+ tests)

- Widget update flows
- Multi-target scenarios
- Data persistence
- Real-world scenarios

**Performance** (30+ tests)

- Write/read throughput
- Latency measurements
- Memory efficiency
- Stress testing

### Running Tests

```bash
# All tests
swift test

# Specific suite
swift test --filter ExpoTargetsStorageModuleTests

# With coverage
xcodebuild test -enableCodeCoverage YES
```

### Mock Objects

**MockUserDefaults**

```swift
let storage = MockUserDefaults(suiteName: "group.com.test.app")
storage?.set("value", forKey: "key")
XCTAssertTrue(storage.wasSynchronizeCalled())
storage?.clearStorage()
```

**MockExtensionContext**

```swift
let context = MockExtensionContext()
context.addMockTextItem("Sample text")
context.addMockURLItem(URL(string: "https://example.com")!)
context.completeRequest(returningItems: nil)
```

**MockWidgetCenter**

```swift
let widgetCenter = MockWidgetCenter.shared
widgetCenter.reloadTimelines(ofKind: "TestWidget")
XCTAssertTrue(widgetCenter.reloadTimelinesCalled)
widgetCenter.reset()
```

### Test Patterns

**AAA Pattern**

```swift
func testSetString_StoresValue() {
    // Arrange
    let value = "Hello"

    // Act
    storage.set(value, forKey: testKey)

    // Assert
    XCTAssertEqual(storage.string(forKey: testKey), value)
}
```

**Async Testing**

```swift
func testAsyncOperation() async {
    let result = await fetchData()
    XCTAssertNotNil(result)
}
```

**Performance Testing**

```swift
func testPerformance_SmallStringWrites() {
    measure {
        for i in 0..<1000 {
            storage.set("value\(i)", forKey: "key\(i)")
        }
    }
}
```

## TypeScript Build Tests

### Structure

```
tests/e2e/
├── framework/
│   ├── TestRunner.ts
│   ├── BuildTestRunner.ts
│   ├── XcodeHelper.ts
│   ├── PrebuildValidator.ts
│   └── RuntimeTester.ts
├── prebuild/index.test.ts
├── compilation/index.test.ts
├── runtime/
│   ├── widget/widget.test.ts
│   ├── share/share.test.ts
│   └── clip/clip.test.ts
└── fixtures/test-widget-basic/
```

### Coverage

**Prebuild** (6+ tests)

- Project generation
- Target creation
- Entitlements & App Groups
- Asset generation

**Compilation** (6+ tests)

- Debug/release builds
- Multi-target builds
- Build performance
- Artifact verification

**Runtime** (15+ tests)

- App installation & launch
- Data sharing via App Groups
- Widget refresh
- Extension validation

### Running Tests

```bash
cd tests/e2e
npm install

# All tests
npm test

# Specific suites
npm run test:prebuild
npm run test:compile
npm run test:runtime

# Specific target type
npm run test:widget
npm run test:share
npm run test:clip
```

### Framework API

**TestRunner**

```typescript
const runner = new TestRunner();
const result = await runner.runTest('Test name', async () => {
  // Test logic
});
```

**BuildTestRunner**

```typescript
const buildRunner = new BuildTestRunner();
await buildRunner.testPrebuildGeneratesProject(projectPath);
await buildRunner.testBuildSucceeds(buildConfig);
```

**XcodeHelper**

```typescript
const xcode = new XcodeHelper();
const project = await xcode.findProject(projectPath);
const result = await xcode.build(config);
```

**PrebuildValidator**

```typescript
const validator = new PrebuildValidator();
const result = await validator.validateAll(projectPath, targetName, targetType);
```

**RuntimeTester**

```typescript
const tester = new RuntimeTester();
await tester.installApp(udid, appPath);
const data = await tester.readSharedData(udid, bundleId, appGroup);
```

## Performance Baselines

| Operation    | Target  | Notes             |
| ------------ | ------- | ----------------- |
| Single Write | < 1ms   | Storage operation |
| Single Read  | < 0.5ms | Storage operation |
| 1000 Writes  | < 500ms | Bulk operation    |
| Prebuild     | < 45s   | Clean prebuild    |
| Debug Build  | < 120s  | Simulator         |
| App Launch   | < 5s    | Simulator         |

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Swift tests
        run: swift test

  build-tests:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Run build tests
        run: |
          cd tests/e2e
          npm install
          npm test
```

## Requirements

- macOS with Xcode
- Node.js 18+
- iOS Simulator
- expo-cli

## Troubleshooting

**Simulator Issues**

```bash
xcrun simctl list devices available
xcrun simctl boot "iPhone 15"
xcrun simctl erase "iPhone 15"
```

**Build Failures**

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
xcodebuild clean -scheme YourScheme
```

**Permission Issues**

```bash
xcode-select --install
sudo xcodebuild -license accept
```
