# Share Extension Configuration

Detailed reference for configuring iOS share extensions in expo-targets.

## Overview

Share extensions allow users to share content from other apps into your app. The share extension appears in the iOS share sheet and can accept text, URLs, images, videos, and files.

## Basic Configuration

```json
{
  "type": "share",
  "name": "ShareExt",
  "displayName": "Share to App",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "13.0"
  }
}
```

For React Native-enabled share extensions, see [React Native Extensions Guide](./react-native-extensions.md).

## Activation Rules

Control what content types your share extension accepts using `ios.activationRules`:

```json
{
  "ios": {
    "activationRules": [
      { "type": "text" },
      { "type": "url" },
      { "type": "image", "maxCount": 5 },
      { "type": "video", "maxCount": 1 }
    ]
  }
}
```

### Content Types

| Type      | Description                        | Supports maxCount |
| --------- | ---------------------------------- | ----------------- |
| `text`    | Plain text content                 | No                |
| `url`     | URLs (including web URLs)          | Yes               |
| `image`   | Image files (jpg, png, gif, etc.)  | Yes               |
| `video`   | Video files (mov, mp4, etc.)       | Yes               |
| `file`    | Generic files                      | Yes               |
| `webpage` | Web pages (requires preprocessing) | Yes               |

### Maximum Count

For types supporting `maxCount`, specify how many items to accept:

```json
{
  "ios": {
    "activationRules": [
      { "type": "image", "maxCount": 10 },
      { "type": "url", "maxCount": 1 }
    ]
  }
}
```

**Default:** `1` if not specified

### Default Behavior

Without `activationRules`, the share extension accepts:

- Text content
- URLs (1 maximum)

Equivalent to:

```json
{
  "ios": {
    "activationRules": [{ "type": "text" }, { "type": "url" }]
  }
}
```

## Web Page Preprocessing

Extract data from web pages before the share extension opens:

```json
{
  "ios": {
    "activationRules": [{ "type": "webpage" }],
    "preprocessingFile": "./targets/share-ext/preprocessing.js"
  }
}
```

**preprocessing.js:**

```javascript
class ShareExtensionPreprocessor {
  run(args) {
    args.completionFunction({
      url: window.location.href,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      selection: window.getSelection().toString(),
    });
  }
}

var ExtensionPreprocessingJS = new ShareExtensionPreprocessor();
```

**Access preprocessed data:**

```typescript
import { getSharedData } from 'expo-targets';

const data = getSharedData();
console.log(data.preprocessedData); // { url, title, description, selection }
```

**Notes:**

- `webpage` type enables `NSExtensionActivationSupportsWebPageWithMaxCount`
- `url` type also enables webpage support automatically
- Preprocessing runs in Safari's JavaScript context

## Configuration Examples

### Social Media App

Accept text and multiple images:

```json
{
  "ios": {
    "activationRules": [{ "type": "text" }, { "type": "image", "maxCount": 10 }]
  }
}
```

### Bookmark Manager

URLs only:

```json
{
  "ios": {
    "activationRules": [{ "type": "url" }]
  }
}
```

### Media Downloader

URLs with web page preprocessing:

```json
{
  "ios": {
    "activationRules": [{ "type": "url" }],
    "preprocessingFile": "./preprocessing.js"
  }
}
```

### File Manager

All content types:

```json
{
  "ios": {
    "activationRules": [
      { "type": "text" },
      { "type": "url" },
      { "type": "image", "maxCount": 50 },
      { "type": "video", "maxCount": 10 },
      { "type": "file", "maxCount": 20 }
    ]
  }
}
```

## Implementation Details

### Info.plist Mapping

Activation rules map to iOS-native keys:

| Rule                             | iOS Key                                               |
| -------------------------------- | ----------------------------------------------------- |
| `{ type: "text" }`               | `NSExtensionActivationSupportsText: true`             |
| `{ type: "url" }`                | `NSExtensionActivationSupportsWebURLWithMaxCount: N`  |
| `{ type: "image", maxCount: N }` | `NSExtensionActivationSupportsImageWithMaxCount: N`   |
| `{ type: "video", maxCount: N }` | `NSExtensionActivationSupportsMovieWithMaxCount: N`   |
| `{ type: "file", maxCount: N }`  | `NSExtensionActivationSupportsFileWithMaxCount: N`    |
| `{ type: "webpage" }`            | `NSExtensionActivationSupportsWebPageWithMaxCount: N` |

### Info.plist Structure

Generated automatically:

```xml
<key>NSExtension</key>
<dict>
  <key>NSExtensionAttributes</key>
  <dict>
    <key>NSExtensionActivationRule</key>
    <dict>
      <key>NSExtensionActivationSupportsText</key>
      <true/>
      <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
      <integer>1</integer>
      <key>NSExtensionActivationSupportsImageWithMaxCount</key>
      <integer>5</integer>
    </dict>
  </dict>
  <key>NSExtensionPrincipalClass</key>
  <string>$(PRODUCT_MODULE_NAME).ShareViewController</string>
  <key>NSExtensionPointIdentifier</key>
  <string>com.apple.share-services</string>
</dict>
```

## Advanced Configuration

### Custom Info.plist Overrides

Override Info.plist keys using `infoPlist`:

```json
{
  "ios": {
    "activationRules": [{ "type": "text" }],
    "infoPlist": {
      "NSExtension": {
        "NSExtensionAttributes": {
          "NSExtensionActivationRule": {
            "NSExtensionActivationSupportsText": true,
            "NSExtensionActivationUsesStrictMatching": true
          }
        }
      }
    }
  }
}
```

**Note:** `infoPlist` is deep merged AFTER `activationRules`, so custom values take precedence.

### Migration from Manual Configuration

**Before (manual Info.plist):**

```json
{
  "infoPlist": {
    "NSExtension": {
      "NSExtensionAttributes": {
        "NSExtensionActivationRule": {
          "NSExtensionActivationSupportsText": true,
          "NSExtensionActivationSupportsWebURLWithMaxCount": 1,
          "NSExtensionActivationSupportsImageWithMaxCount": 5
        }
      }
    }
  }
}
```

**After (activation rules):**

```json
{
  "ios": {
    "activationRules": [
      { "type": "text" },
      { "type": "url" },
      { "type": "image", "maxCount": 5 }
    ]
  }
}
```

## Troubleshooting

### Share extension doesn't appear

**Causes:**

- `activationRules` don't match shared content type
- Bundle identifier incorrect
- Extension not embedded in main app

**Solutions:**

1. Verify `activationRules` match content you're sharing
2. Check bundle ID format (should end with `.share` or similar)
3. Run `npx expo prebuild -p ios --clean`
4. Check extension target exists in Xcode

### Wrong content types accepted

**Solutions:**

1. Review `activationRules` configuration
2. Test with different content types
3. Check generated Info.plist in Xcode:
   - Open Xcode
   - Select share extension target
   - View Info tab
   - Verify NSExtension configuration

### Extension crashes on launch

**Causes:**

- Missing `ShareViewController.swift`
- Incorrect class name
- React Native issues (if using RN)

**Solutions:**

1. Verify `ShareViewController.swift` exists in `targets/{name}/ios/`
2. Check class name matches `ShareViewController`
3. For RN extensions, see [React Native Extensions Guide](./react-native-extensions.md)
4. Check Xcode console for error messages

## See Also

- [Config Reference](./config-reference.md) - Complete configuration options
- [React Native Extensions](./react-native-extensions.md) - Using RN in share extensions
- [API Reference](./api-reference.md) - Runtime APIs
- [Apple Documentation](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/Share.html)
