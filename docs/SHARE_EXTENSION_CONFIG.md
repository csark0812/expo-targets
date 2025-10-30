# Share Extension Configuration Guide

This guide covers the configuration options for iOS share extensions in expo-targets.

## Overview

Share extensions allow users to share content from other apps into your app. The share extension appears in the iOS share sheet and can accept various types of content including text, URLs, images, videos, and files.

## Basic Configuration

```json
{
  "type": "share",
  "name": "ContentShare",
  "displayName": "Share to App",
  "platforms": ["ios"],
  "appGroup": "group.com.yourapp",
  "ios": {
    "deploymentTarget": "13.0",
    "bundleIdentifier": "com.yourapp.share",
    "displayName": "Share Extension"
  }
}
```

## Activation Rules

Control what content types your share extension accepts using the `ios.activationRules` configuration:

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

For content types that support `maxCount`, you can specify how many items to accept:

```json
{
  "ios": {
    "activationRules": [
      { "type": "image", "maxCount": 10 }, // Accept up to 10 images
      { "type": "url", "maxCount": 1 } // Accept 1 URL
    ]
  }
}
```

**Default:** If `maxCount` is not specified, it defaults to `1`.

## Web Page Preprocessing

To extract data from web pages before the share extension opens, use a preprocessing JavaScript file:

```json
{
  "ios": {
    "activationRules": [{ "type": "webpage" }],
    "preprocessingFile": "./preprocessing.js"
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
    });
  }
}

var ExtensionPreprocessingJS = new ShareExtensionPreprocessor();
```

**Important:** When using `preprocessingFile`:

- The `webpage` type enables `NSExtensionActivationSupportsWebPageWithMaxCount`
- The `url` type will also enable webpage support automatically
- Your preprocessing results will be available in the extension's initial data

## Default Behavior

If you don't specify `activationRules`, the share extension will accept:

- Text content
- URLs (1 maximum)

This is equivalent to:

```json
{
  "ios": {
    "activationRules": [{ "type": "text" }, { "type": "url" }]
  }
}
```

## Examples

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

Accept URLs only:

```json
{
  "ios": {
    "activationRules": [{ "type": "url" }]
  }
}
```

### Media Downloader

Accept URLs with web page preprocessing:

```json
{
  "ios": {
    "activationRules": [{ "type": "url" }],
    "preprocessingFile": "./preprocessing.js"
  }
}
```

### File Manager

Accept all types:

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

The `activationRules` are converted to iOS-native keys:

| Rule                             | iOS Key                                               |
| -------------------------------- | ----------------------------------------------------- |
| `{ type: "text" }`               | `NSExtensionActivationSupportsText: true`             |
| `{ type: "url" }`                | `NSExtensionActivationSupportsWebURLWithMaxCount: N`  |
| `{ type: "image", maxCount: N }` | `NSExtensionActivationSupportsImageWithMaxCount: N`   |
| `{ type: "video", maxCount: N }` | `NSExtensionActivationSupportsMovieWithMaxCount: N`   |
| `{ type: "file", maxCount: N }`  | `NSExtensionActivationSupportsFileWithMaxCount: N`    |
| `{ type: "webpage" }`            | `NSExtensionActivationSupportsWebPageWithMaxCount: N` |

### Swift View Controller

Your share extension uses `ShareViewController.swift` which:

- Inherits from `UIViewController`
- Uses programmatic UI (no storyboard required)
- Accesses shared content via `extensionContext`

The Info.plist automatically configures:

```xml
<key>NSExtensionPrincipalClass</key>
<string>$(PRODUCT_MODULE_NAME).ShareViewController</string>
```

## Advanced Configuration

### Custom Info.plist Overrides

You can override any Info.plist key using the `infoPlist` option:

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

**Note:** The `infoPlist` is merged AFTER `activationRules` configuration, so it takes precedence.

## Migration from Manual Configuration

If you were previously using manual `infoPlist` configuration:

**Before:**

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

**After:**

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

### Share extension doesn't appear in share sheet

- Check your `activationRules` match the content you're sharing
- Verify `bundleIdentifier` is correct (should be `your.app.id.share`)
- Ensure the extension is embedded in the main app

### Share extension crashes on launch

- Verify `ShareViewController.swift` exists in `targets/your-share/ios/`
- Check that class name matches `ShareViewController`
- Review Xcode console for specific error messages

### Wrong content types accepted

- Review your `activationRules` configuration
- Test with different content types to verify behavior
- Check generated `Info.plist` in Xcode

## References

- [Apple: Share Extensions](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/Share.html)
- [Apple: Extension Activation Rules](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/ExtensionScenarios.html)
- [expo-targets Documentation](../README.md)
