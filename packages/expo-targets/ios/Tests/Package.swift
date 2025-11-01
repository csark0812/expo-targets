// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "ExpoTargetsTests",
    platforms: [
        .iOS(.v14)
    ],
    products: [
        .library(
            name: "ExpoTargetsTests",
            targets: ["ExpoTargetsTests"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "ExpoTargetsTestHelpers",
            dependencies: [],
            path: "Helpers"
        ),
        .testTarget(
            name: "ExpoTargetsStorageModuleTests",
            dependencies: ["ExpoTargetsTestHelpers"],
            path: "Unit/Storage"
        ),
        .testTarget(
            name: "ExpoTargetsExtensionModuleTests",
            dependencies: ["ExpoTargetsTestHelpers"],
            path: "Unit/Extension"
        ),
        .testTarget(
            name: "ExpoTargetsIntegrationTests",
            dependencies: ["ExpoTargetsTestHelpers"],
            path: "Integration"
        ),
        .testTarget(
            name: "ExpoTargetsPerformanceTests",
            dependencies: ["ExpoTargetsTestHelpers"],
            path: "Performance"
        ),
        .testTarget(
            name: "ExpoTargetsTests",
            dependencies: [
                "ExpoTargetsTestHelpers",
                "ExpoTargetsStorageModuleTests",
                "ExpoTargetsExtensionModuleTests",
                "ExpoTargetsIntegrationTests",
                "ExpoTargetsPerformanceTests"
            ],
            path: "Main"
        )
    ]
)
