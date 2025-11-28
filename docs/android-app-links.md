# Android App Links and Instant Apps

## Android Equivalents to iOS App Clips

While iOS has App Clips, Android has two related technologies:

### 1. Android App Links

**What they are:**
- Deep links that open your app directly from web URLs
- No need for the user to choose which app to open (unlike regular deep links)
- Verified association between your app and your website domain
- Available since Android 6.0 (API level 23)

**How they work:**
- User clicks a link (e.g., https://example.com/product/123)
- Android verifies your app owns that domain
- App opens directly to the relevant screen
- No disambiguation dialog

**Status in expo-targets:**
- ⚠️ Not yet implemented as a target type
- Can be configured manually via app.json

**Manual Configuration:**

```json
{
  "expo": {
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "example.com",
              "pathPrefix": "/product"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

You also need to host a `assetlinks.json` file on your domain:

```
https://example.com/.well-known/assetlinks.json
```

### 2. Google Play Instant (Instant Apps)

**What they are:**
- Lightweight versions of your app that run without installation
- Users can try your app instantly from a link
- Limited to 15MB total size
- Require Google Play services

**How they work:**
- User clicks a link or taps "Try Now" in Play Store
- Google Play downloads and runs a lightweight version instantly
- No installation required
- Can upgrade to full app seamlessly

**Status in expo-targets:**
- ❌ Not currently supported
- Requires significant additional configuration
- May be added in future releases

**Key Differences from App Clips:**

| Feature | iOS App Clips | Android Instant Apps |
|---------|---------------|----------------------|
| Size Limit | 15MB (uncompressed) | 15MB (APK) |
| Platform | iOS 14+ | Android 6.0+ |
| Distribution | App Store | Google Play Store |
| Installation | Never installed | Optional upgrade |
| Permissions | Limited | Same as full app |
| Discovery | NFC, QR, Links, Maps | Links, Play Store |
| Requires Account | No | No |

## Recommendations

### For Simple Deep Linking

Use standard Expo deep linking:

```json
{
  "expo": {
    "scheme": "myapp",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "https",
              "host": "example.com"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

Then handle links in your app:

```typescript
import { Linking } from 'react-native';
import { useEffect } from 'react';

useEffect(() => {
  const handleUrl = ({ url }: { url: string }) => {
    // Handle the URL
    console.log('Opened with URL:', url);
  };

  // Listen for URLs
  const subscription = Linking.addEventListener('url', handleUrl);

  // Check if app was opened with a URL
  Linking.getInitialURL().then(url => {
    if (url) handleUrl({ url });
  });

  return () => subscription.remove();
}, []);
```

### For App Clip-like Experiences

**Option 1: Android App Links (Recommended)**
- Use verified App Links for seamless URL opening
- Combine with a lightweight landing screen
- Much easier to implement than Instant Apps
- Works on all Android 6.0+ devices

**Option 2: Progressive Web App (PWA)**
- Build a web version of your app
- Use TWA (Trusted Web Activity) for native-like experience
- No size limits
- Works across all platforms

**Option 3: Wait for expo-targets Support**
- We're considering adding App Links as a target type
- Would provide similar developer experience to iOS App Clips
- Automatic configuration and verification
- Potential future feature

## Future Support

We're evaluating adding first-class support for Android App Links in expo-targets:

```json
// Potential future config
{
  "type": "app-link",
  "name": "ProductDeepLink",
  "platforms": ["android"],
  "android": {
    "domains": ["example.com", "www.example.com"],
    "pathPrefixes": ["/product", "/item"]
  }
}
```

This would automatically:
- Configure AndroidManifest.xml
- Generate verification instructions
- Provide testing utilities
- Handle routing in React Native

**Vote for this feature:** Open an issue on GitHub if you'd like to see this implemented.

## Resources

- [Android App Links Documentation](https://developer.android.com/training/app-links)
- [Google Play Instant Overview](https://developer.android.com/topic/google-play-instant)
- [Expo Deep Linking Guide](https://docs.expo.dev/guides/deep-linking/)
- [Digital Asset Links (assetlinks.json)](https://developers.google.com/digital-asset-links/v1/getting-started)

## Comparison Table: All Options

| Feature | iOS App Clips | Android Instant Apps | Android App Links | Share Extensions |
|---------|---------------|---------------------|-------------------|------------------|
| **expo-targets Support** | ✅ Full | ❌ None | 🔜 Planned | ✅ Full |
| **Size Limit** | 15MB | 15MB | None (full app) | None |
| **Installation** | Temporary | Optional | Permanent | Permanent |
| **Discovery** | NFC, QR, Links | Links, Play Store | Web Links | Share Sheet |
| **Permissions** | Limited | Same as app | Same as app | Same as app |
| **Complexity** | Medium | High | Low | Low |
| **Adoption** | Medium | Low | High | High |

## Conclusion

For most use cases on Android, we recommend:

1. **Share Extensions** - Now fully supported in expo-targets (use this for sharing content)
2. **Standard Deep Links** - Built into Expo, easy to configure
3. **Android App Links** - For verified, seamless URL opening (manual config for now)

App Clips-like functionality is best achieved through App Links rather than Instant Apps, as Instant Apps have limited adoption and significant technical requirements.
