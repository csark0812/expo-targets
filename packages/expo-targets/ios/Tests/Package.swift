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
            name: "ExpoTargetsStorage",
            dependencies: [],
            path: "../",
            sources: ["ExpoTargetsStorageModule.swift"]
        ),
        .target(
            name: "ExpoTargetsExtension",
            dependencies: [],
            path: "../",
            sources: ["ExpoTargetsExtensionModule.swift"]
        ),
        .target(
            name: "ExpoTargetsTestHelpers",
            dependencies: [],
            path: "Helpers"
        ),
        .testTarget(
            name: "ExpoTargetsStorageModuleTests",
            dependencies: ["ExpoTargetsTestHelpers", "ExpoTargetsStorage"],
            path: "Unit/Storage"
        ),
        .testTarget(
            name: "ExpoTargetsExtensionModuleTests",
            dependencies: ["ExpoTargetsTestHelpers", "ExpoTargetsExtension"],
            path: "Unit/Extension"
        ),
        .testTarget(
            name: "ExpoTargetsIntegrationTests",
            dependencies: ["ExpoTargetsTestHelpers", "ExpoTargetsStorage", "ExpoTargetsExtension"],
            path: "Integration"
        ),
        .testTarget(
            name: "ExpoTargetsPerformanceTests",
            dependencies: ["ExpoTargetsTestHelpers", "ExpoTargetsStorage"],
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
