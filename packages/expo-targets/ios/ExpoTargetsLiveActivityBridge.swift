import Foundation

/// Registry for CNG-generated Live Activity host bridges.
/// Generated code in `ios/*/ExpoTargetsGenerated/` calls `register` at load time.
public enum ExpoTargetsLiveActivityBridge {
  public struct Handler {
    public let start: (_ attributesJson: String, _ contentStateJson: String) async throws -> String
    public let update: (_ activityId: String, _ contentStateJson: String) async throws -> Bool
    public let end: (_ activityId: String) async throws -> Void
    public let endAll: () async throws -> Void

    public init(
      start: @escaping (_ attributesJson: String, _ contentStateJson: String) async throws -> String,
      update: @escaping (_ activityId: String, _ contentStateJson: String) async throws -> Bool,
      end: @escaping (_ activityId: String) async throws -> Void,
      endAll: @escaping () async throws -> Void
    ) {
      self.start = start
      self.update = update
      self.end = end
      self.endAll = endAll
    }
  }

  private static var handlers: [String: Handler] = [:]
  private static let lock = NSLock()

  public static func register(attributesName: String, handler: Handler) {
    lock.lock()
    defer { lock.unlock() }
    handlers[attributesName] = handler
  }

  public static func handler(for attributesName: String) -> Handler? {
    lock.lock()
    defer { lock.unlock() }
    return handlers[attributesName]
  }

  public static func allHandlers() -> [Handler] {
    lock.lock()
    defer { lock.unlock() }
    return Array(handlers.values)
  }

  public static var registeredNames: [String] {
    lock.lock()
    defer { lock.unlock() }
    return Array(handlers.keys)
  }
}
