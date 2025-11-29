/**
 * Safari Web Extension utilities
 *
 * Generates web resources and Swift handler for Safari extensions
 */

import fs from 'fs';
import path from 'path';

import * as File from './file';

// ============================================================================
// Swift Handler Generation
// ============================================================================

/**
 * Generate SafariWebExtensionHandler.swift
 * This handles native message passing from JavaScript
 */
export function generateSafariSwiftHandler(targetName: string): string {
  return `import SafariServices
import os.log

/// Native message handler for ${targetName} Safari extension.
/// Called when JavaScript uses \`browser.runtime.sendNativeMessage()\`
/// or the \`useSendToNative()\` hook from expo-targets.
class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem

        // Extract message from JavaScript
        let message: Any?
        if #available(iOS 15.0, *) {
            message = request?.userInfo?[SFExtensionMessageKey]
        } else {
            message = request?.userInfo?["message"]
        }

        os_log(.default, "${targetName} received native message: %@", String(describing: message))

        // Process message and prepare response
        var responseData: [String: Any] = [
            "status": "ok",
            "extensionName": "${targetName}"
        ]

        if let messageDict = message as? [String: Any] {
            // Echo back received data - customize this for your needs
            responseData["received"] = messageDict
            responseData["timestamp"] = Date().timeIntervalSince1970
        }

        // Send response back to JavaScript
        let response = NSExtensionItem()
        if #available(iOS 15.0, *) {
            response.userInfo = [SFExtensionMessageKey: responseData]
        } else {
            response.userInfo = ["message": responseData]
        }

        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
`;
}

/**
 * Check if user has provided a custom Safari Swift handler
 */
export function hasUserSafariSwiftHandler(targetDirectory: string): boolean {
  const userSwiftPath = path.join(
    targetDirectory,
    'ios',
    'SafariWebExtensionHandler.swift'
  );
  return fs.existsSync(userSwiftPath);
}

/**
 * Write Safari Swift handler to the build directory (if user hasn't provided one)
 * Returns the path to the Swift file (either user's or generated)
 */
export function ensureSafariSwiftHandler(
  targetDirectory: string,
  targetBuildPath: string,
  targetName: string
): { path: string; isGenerated: boolean } {
  // Check if user provided their own handler in ios/
  const userSwiftPath = path.join(
    targetDirectory,
    'ios',
    'SafariWebExtensionHandler.swift'
  );

  if (fs.existsSync(userSwiftPath)) {
    return { path: userSwiftPath, isGenerated: false };
  }

  // Generate in build directory
  const generatedSwiftPath = path.join(
    targetBuildPath,
    'SafariWebExtensionHandler.swift'
  );
  const swiftContent = generateSafariSwiftHandler(targetName);
  File.writeFileSafe(generatedSwiftPath, swiftContent);

  return { path: generatedSwiftPath, isGenerated: true };
}

export interface SafariManifestConfig {
  name: string;
  version?: string;
  description?: string;
  permissions?: string[];
  content_scripts?: {
    matches: string[];
    js?: string[];
    css?: string[];
  }[];
  icons?: Record<string, string>;
}

/**
 * Generate popup.html for Safari extension
 * This loads the bundled React Native Web code
 */
export function generatePopupHtml(
  outputPath: string,
  targetName: string
): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${targetName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body, #root {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fff;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background: #1c1c1e;
        color: #fff;
      }
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="popup.js"></script>
</body>
</html>`;

  File.writeFileSafe(outputPath, html);
}

/**
 * Generate manifest.json for Safari extension
 */
export function generateManifest(
  outputPath: string,
  config: SafariManifestConfig
): void {
  const manifest = {
    manifest_version: 3,
    name: config.name,
    version: config.version || '1.0.0',
    description: config.description || `${config.name} Safari Extension`,

    // Default permissions for Safari extensions
    permissions: config.permissions || ['storage'],

    // Background script (optional, for handling native messages)
    background: {
      scripts: ['background.js'],
      persistent: false,
    },

    // Popup configuration
    action: {
      default_popup: 'popup.html',
      default_icon: config.icons || {
        '16': 'images/icon-16.png',
        '32': 'images/icon-32.png',
        '48': 'images/icon-48.png',
        '128': 'images/icon-128.png',
      },
    },

    // Content scripts (if provided)
    ...(config.content_scripts && config.content_scripts.length > 0
      ? { content_scripts: config.content_scripts }
      : {}),

    // Icons
    icons: config.icons || {
      '16': 'images/icon-16.png',
      '32': 'images/icon-32.png',
      '48': 'images/icon-48.png',
      '128': 'images/icon-128.png',
    },
  };

  File.writeFileSafe(outputPath, JSON.stringify(manifest, null, 2));
}

/**
 * Generate a minimal background.js for Safari extension
 */
export function generateBackgroundScript(outputPath: string): void {
  const script = `// Safari Web Extension Background Script
// Handles communication between popup and native Swift handler

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages to native handler if needed
  if (message.type === 'native') {
    browser.runtime.sendNativeMessage('', message.payload)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }
});
`;

  File.writeFileSafe(outputPath, script);
}

/**
 * Generate placeholder popup.js
 * This will be replaced by the actual bundle during build
 */
export function generatePlaceholderPopupScript(
  outputPath: string,
  targetName: string
): void {
  const script = `// Placeholder for ${targetName} Safari Extension
// This file will be replaced by the bundled React Native Web code during build

(function() {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = '<div style="padding: 16px; text-align: center;">' +
      '<p>Safari Extension: ${targetName}</p>' +
      '<p style="font-size: 12px; color: #888;">Build the extension to see your React Native code</p>' +
      '</div>';
  }
})();
`;

  File.writeFileSafe(outputPath, script);
}

/**
 * Generate placeholder icons for Safari extension
 */
export function generatePlaceholderIcons(resourcesPath: string): void {
  const imagesPath = path.join(resourcesPath, 'images');
  File.ensureDirectoryExists(imagesPath);

  // Generate simple placeholder SVG-based icons at different sizes
  const sizes = [16, 32, 48, 128];

  for (const size of sizes) {
    const iconPath = path.join(imagesPath, `icon-${size}.png`);
    // Only create if doesn't exist - don't overwrite user icons
    if (!fs.existsSync(iconPath)) {
      // Create a minimal valid PNG (1x1 transparent pixel as placeholder)
      // This is a minimal valid PNG file
      const minimalPng = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d, // IHDR length
        0x49,
        0x48,
        0x44,
        0x52, // IHDR
        0x00,
        0x00,
        0x00,
        0x01, // width: 1
        0x00,
        0x00,
        0x00,
        0x01, // height: 1
        0x08,
        0x06, // bit depth: 8, color type: RGBA
        0x00,
        0x00,
        0x00, // compression, filter, interlace
        0x1f,
        0x15,
        0xc4,
        0x89, // IHDR CRC
        0x00,
        0x00,
        0x00,
        0x0a, // IDAT length
        0x49,
        0x44,
        0x41,
        0x54, // IDAT
        0x78,
        0x9c,
        0x63,
        0x00,
        0x01,
        0x00,
        0x00,
        0x05,
        0x00,
        0x01, // compressed data
        0x0d,
        0x0a,
        0x2d,
        0xb4, // IDAT CRC
        0x00,
        0x00,
        0x00,
        0x00, // IEND length
        0x49,
        0x45,
        0x4e,
        0x44, // IEND
        0xae,
        0x42,
        0x60,
        0x82, // IEND CRC
      ]);
      fs.writeFileSync(iconPath, minimalPng);
    }
  }
}

/**
 * Generate all Safari web extension resources
 */
export function generateSafariResources(
  resourcesPath: string,
  config: {
    name: string;
    displayName?: string;
    manifest?: Partial<SafariManifestConfig>;
  }
): void {
  File.ensureDirectoryExists(resourcesPath);

  const targetDisplayName = config.displayName || config.name;

  // Generate popup.html
  generatePopupHtml(path.join(resourcesPath, 'popup.html'), targetDisplayName);

  // Generate manifest.json with optional overrides
  generateManifest(path.join(resourcesPath, 'manifest.json'), {
    name: targetDisplayName,
    ...config.manifest,
  });

  // Generate background.js
  generateBackgroundScript(path.join(resourcesPath, 'background.js'));

  // Generate placeholder popup.js (will be replaced by bundle)
  generatePlaceholderPopupScript(
    path.join(resourcesPath, 'popup.js'),
    targetDisplayName
  );

  // Generate placeholder icons
  generatePlaceholderIcons(resourcesPath);
}

/**
 * Check if user has provided custom Safari Resources
 */
export function hasCustomSafariResources(targetDirectory: string): boolean {
  const resourcesPath = path.join(targetDirectory, 'ios', 'Resources');
  const manifestPath = path.join(resourcesPath, 'manifest.json');

  return fs.existsSync(manifestPath);
}
