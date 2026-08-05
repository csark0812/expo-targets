import CryptoKit
import ExpoModulesCore
import Foundation

/**
 Host-only: atomically install a sideloaded extension `main.jsbundle` into the
 App Group container for Release appex load. Mirrors Node `fsInstall` layout:
 `{container}/expo-targets/bundles/{targetName}/{main.jsbundle,manifest.json}`.
 */
public class ExpoTargetsExtensionBundleModule: Module {
  private static let errorDomain = "ExpoTargetsExtensionBundle"

  private static let maxBytesByType: [String: Int] = [
    "share": 5 * 1024 * 1024,
    "action": 5 * 1024 * 1024,
    "messages": 5 * 1024 * 1024,
    "notification-content": 5 * 1024 * 1024,
    "clip": 8 * 1024 * 1024,
  ]

  private func fail(_ message: String, code: Int = 1) -> NSError {
    NSError(
      domain: Self.errorDomain,
      code: code,
      userInfo: [NSLocalizedDescriptionKey: message]
    )
  }

  private func maxBytes(for type: String) throws -> Int {
    guard let max = Self.maxBytesByType[type] else {
      throw fail(
        "No sideload size cap for extension type \"\(type)\". Supported: \(Self.maxBytesByType.keys.sorted().joined(separator: ", "))"
      )
    }
    return max
  }

  private func containerURL(appGroup: String) throws -> URL {
    guard
      let url = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: appGroup
      )
    else {
      throw fail(
        "App Group container unavailable for \"\(appGroup)\". Check entitlements."
      )
    }
    return url
  }

  private func normalizeLocalPath(_ localPath: String) -> String {
    if localPath.hasPrefix("file://") {
      return URL(string: localPath)?.path ?? localPath.replacingOccurrences(
        of: "file://",
        with: ""
      )
    }
    return localPath
  }

  private func sha256Hex(_ data: Data) -> String {
    SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
  }

  private func bundleDir(container: URL, targetName: String) -> URL {
    container
      .appendingPathComponent("expo-targets", isDirectory: true)
      .appendingPathComponent("bundles", isDirectory: true)
      .appendingPathComponent(targetName, isDirectory: true)
  }

  public func definition() -> ModuleDefinition {
    Name("ExpoTargetsExtensionBundle")

    AsyncFunction("install") {
      (
        appGroup: String,
        targetName: String,
        type: String,
        runtimeVersion: String,
        localPath: String
      ) -> [String: Any] in
      if runtimeVersion.isEmpty {
        throw self.fail(
          "runtimeVersion is required to install an extension bundle (fail closed)"
        )
      }

      let max = try self.maxBytes(for: type)
      let sourcePath = self.normalizeLocalPath(localPath)
      let sourceURL = URL(fileURLWithPath: sourcePath)
      guard FileManager.default.fileExists(atPath: sourceURL.path) else {
        throw self.fail("Extension bundle not found: \(sourcePath)")
      }

      let attrs = try FileManager.default.attributesOfItem(atPath: sourceURL.path)
      let byteLength = (attrs[.size] as? NSNumber)?.intValue ?? 0
      if byteLength > max {
        throw self.fail(
          "Extension bundle for \"\(targetName)\" is \(byteLength) bytes; max for type \"\(type)\" is \(max)"
        )
      }

      let data = try Data(contentsOf: sourceURL)
      let sha256 = self.sha256Hex(data)
      let container = try self.containerURL(appGroup: appGroup)
      let destDir = self.bundleDir(container: container, targetName: targetName)
      let tmpDir = URL(
        fileURLWithPath:
          destDir.path + ".tmp-\(ProcessInfo.processInfo.processIdentifier)"
      )

      let fm = FileManager.default
      try? fm.removeItem(at: tmpDir)
      try fm.createDirectory(at: tmpDir, withIntermediateDirectories: true)

      let destBundle = tmpDir.appendingPathComponent("main.jsbundle")
      try data.write(to: destBundle, options: .atomic)

      let installedAt = ISO8601DateFormatter().string(from: Date())
      let manifest: [String: Any] = [
        "byteLength": byteLength,
        "sha256": sha256,
        "installedAt": installedAt,
        "runtimeVersion": runtimeVersion,
        "targetName": targetName,
        "type": type,
      ]
      let manifestData = try JSONSerialization.data(
        withJSONObject: manifest,
        options: [.prettyPrinted, .sortedKeys]
      )
      try manifestData.write(
        to: tmpDir.appendingPathComponent("manifest.json"),
        options: .atomic
      )

      try? fm.removeItem(at: destDir)
      try fm.createDirectory(
        at: destDir.deletingLastPathComponent(),
        withIntermediateDirectories: true
      )
      try fm.moveItem(at: tmpDir, to: destDir)

      return manifest
    }

    Function("clear") { (appGroup: String, targetName: String) in
      let container = try self.containerURL(appGroup: appGroup)
      let destDir = self.bundleDir(container: container, targetName: targetName)
      try? FileManager.default.removeItem(at: destDir)
    }

    Function("getInfo") { (appGroup: String, targetName: String) -> [String: Any]? in
      let container = try self.containerURL(appGroup: appGroup)
      let manifestURL = self.bundleDir(container: container, targetName: targetName)
        .appendingPathComponent("manifest.json")
      guard FileManager.default.fileExists(atPath: manifestURL.path),
            let data = try? Data(contentsOf: manifestURL),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
      else {
        return nil
      }
      return json
    }
  }
}
