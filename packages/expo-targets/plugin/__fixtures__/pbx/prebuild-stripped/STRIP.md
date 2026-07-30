# prebuild-stripped

Phase 4 placeholder — hand-authored minimal app used until a real
`expo prebuild` capture is checked in. Today this is a copy of
`../minimal-app/project.pbxproj`, so the L3 integration test can point at a
"prebuild-shaped" fixture without waiting for the capture.

## Why it exists

The L3 test needs a project that looks like the output of `expo prebuild`
(one app target, real build configurations, a Products group) but must stay
small enough to review in a diff and must parse on Linux without Xcode.

## Strip rules when capturing from a real prebuild

Run `expo prebuild --platform ios` in a scratch app, then take
`ios/<App>.xcodeproj/project.pbxproj` and:

- **Keep** exactly one application native target, its
  `XCConfigurationList` with `Debug`/`Release` `XCBuildConfiguration`s, and the
  project-level configuration list.
- **Keep** the `PBXProject` root object, `mainGroup`, the `Products` group, and
  the `PBXFileReference` for the `.app` product.
- **Keep** empty `Sources` / `Frameworks` / `Resources` build phases on the app
  target.
- **Remove** CocoaPods artifacts: `Pods_*.framework` references and build files,
  `[CP] *` shell script phases, `baseConfigurationReference` pointers into
  `Pods/Target Support Files`, and the `Pods` group.
- **Remove** user schemes, `xcuserdata`, `xcshareddata`, and any
  `DEVELOPMENT_TEAM` / provisioning values.
- **Remove** app source files, asset catalogs, `Info.plist` references, and
  extra targets (tests, widgets, clips) — tests add what they need
  programmatically.
- **Normalize** the app target name to `App` and object UUIDs to stable
  placeholders so diffs stay readable.
