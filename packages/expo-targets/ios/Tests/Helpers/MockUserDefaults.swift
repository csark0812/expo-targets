import Foundation

/// Mock UserDefaults for testing without affecting real app storage
public class MockUserDefaults: UserDefaults {
    private var storage: [String: Any] = [:]
    private var synchronizeCalled = false
    
    public override init?(suiteName suitename: String?) {
        super.init(suiteName: suitename)
    }
    
    public override func set(_ value: Any?, forKey defaultName: String) {
        if let value = value {
            storage[defaultName] = value
        } else {
            storage.removeValue(forKey: defaultName)
        }
    }
    
    public override func set(_ value: Int, forKey defaultName: String) {
        storage[defaultName] = value
    }
    
    public override func string(forKey defaultName: String) -> String? {
        return storage[defaultName] as? String
    }
    
    public override func integer(forKey defaultName: String) -> Int {
        return storage[defaultName] as? Int ?? 0
    }
    
    public override func bool(forKey defaultName: String) -> Bool {
        return storage[defaultName] as? Bool ?? false
    }
    
    public override func object(forKey defaultName: String) -> Any? {
        return storage[defaultName]
    }
    
    public override func removeObject(forKey defaultName: String) {
        storage.removeValue(forKey: defaultName)
    }
    
    public override func dictionaryRepresentation() -> [String : Any] {
        return storage
    }
    
    public override func synchronize() -> Bool {
        synchronizeCalled = true
        return true
    }
    
    // Test helpers
    public func wasSynchronizeCalled() -> Bool {
        return synchronizeCalled
    }
    
    public func resetSynchronizeFlag() {
        synchronizeCalled = false
    }
    
    public func clearStorage() {
        storage.removeAll()
        synchronizeCalled = false
    }
    
    public func getStorageSize() -> Int {
        return storage.count
    }
}
