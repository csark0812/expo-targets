# Custom CocoaPods dependencies for widget target
# Add pods here to use third-party SDKs in your extension

# Secure keychain access for auth tokens shared with main app
pod 'KeychainAccess'

# Async image loading with caching for widget avatars and remote images
# SDWebImageSwiftUI provides WebImage view for SwiftUI with:
# - Async loading with placeholder support
# - Memory and disk caching
# - Animated image support
# - Image processing and transformations
pod 'SDWebImageSwiftUI', '~> 3.0'

