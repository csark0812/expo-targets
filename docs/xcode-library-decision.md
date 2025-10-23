# Xcode Library Decision

## Options Evaluated

### 1. `@bacons/xcode`

- **Pros**: TypeScript native, modern API, used by expo-apple-targets
- **Cons**: Proprietary/private package, not published to npm
- **Status**: Not accessible without direct access to Evan Bacon's work

### 2. `xcode` npm package

- **Pros**: Widely used, stable, available on npm
- **Cons**: Older API, limited TypeScript support, callback-based
- **Package**: `xcode@^3.0.1`
- **Status**: ✅ Available and tested

### 3. `@expo/config-plugins` built-in utilities

- **Pros**: Already a dependency, maintained by Expo team
- **Cons**: Limited Xcode manipulation capabilities, focused on simple modifications
- **Status**: Insufficient for complex target creation

## Decision

**Use `xcode` npm package** for Phase 1 implementation.

### Rationale:

1. Immediately available and well-documented
2. Used by expo-widgets successfully
3. Sufficient capabilities for target creation:

   - PBXNativeTarget creation
   - Build configuration management
   - File reference management
   - Build phase manipulation
   - Framework linking

4. Can be migrated to `@bacons/xcode` later if needed

### Implementation Plan:

1. Install `xcode@^3.0.1` and `@types/xcode`
2. Wrap in TypeScript utilities for type safety
3. Follow patterns from expo-widgets and expo-apple-targets documentation
4. Add comprehensive error handling

### Key Operations Needed:

- `project.parse()` - Load xcodeproj
- `project.addTarget()` - Create extension target
- `project.addBuildPhase()` - Add build phases
- `project.addFramework()` - Link frameworks
- `project.addFile()` - Add source files
- `project.addTargetDependency()` - Link main app to extension
- `project.writeSync()` - Save changes

## Future Considerations

If `@bacons/xcode` becomes publicly available, migration would provide:

- Better TypeScript support
- More intuitive API
- Improved error messages
- Better handling of external file references

For now, `xcode` package is the pragmatic choice for a working MVP.
