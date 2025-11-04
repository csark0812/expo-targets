import * as fs from 'fs';
import * as path from 'path';

import type { ExtensionType } from '../../config';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

export interface ReactNativeViewControllerOptions {
  type: ExtensionType;
  moduleName: string;
  targetName: string;
  preprocessingFile?: string;
  entry?: string;
}

function readTemplate(filename: string): string {
  const templatePath = path.join(TEMPLATES_DIR, filename);
  return fs.readFileSync(templatePath, 'utf-8');
}

function getExtensionDataForType(
  type: ExtensionType,
  preprocessingFile?: string
): {
  properties: string;
  loadMethod: string;
  propsMethod: string;
} {
  switch (type) {
    case 'share': {
      const dataTemplate = readTemplate('share-extension-data.swift');

      // Handle preprocessing file
      let preprocessingLoad = '';
      if (preprocessingFile) {
        preprocessingLoad = `
        // Load preprocessed web data
        if let jsDict = extensionItem.userInfo?[NSExtensionJavaScriptPreprocessingResultsKey] as? [String: Any] {
            self.preprocessedWebData = jsDict
        }`;
      }

      const modifiedTemplate = dataTemplate.replace(
        '{{PREPROCESSING_DATA_LOAD}}',
        preprocessingLoad
      );

      // Split template into sections
      const lines = modifiedTemplate.split('\n');
      const properties: string[] = [];
      const loadMethodLines: string[] = [];
      const propsMethodLines: string[] = [];

      let currentSection: 'properties' | 'load' | 'props' | null = null;

      for (const line of lines) {
        if (line.includes('private var ')) {
          currentSection = 'properties';
          properties.push(line);
        } else if (line.includes('private func loadSharedContent()')) {
          currentSection = 'load';
          loadMethodLines.push(line);
        } else if (line.includes('private func getSharedDataProps()')) {
          currentSection = 'props';
          propsMethodLines.push(line);
        } else if (
          currentSection === 'properties' &&
          line.trim().startsWith('private')
        ) {
          properties.push(line);
        } else if (currentSection === 'load') {
          loadMethodLines.push(line);
        } else if (currentSection === 'props') {
          propsMethodLines.push(line);
        }
      }

      return {
        properties: properties.join('\n    '),
        loadMethod: `// Load shared content before creating React Native view
        Task {
            await loadSharedContent()
            // Create React Native view with loaded content
            await MainActor.run {
                let sharedData = getSharedDataProps()
                setupReactNativeView(with: sharedData)
            }
        }`,
        propsMethod:
          loadMethodLines.join('\n') + '\n\n' + propsMethodLines.join('\n'),
      };
    }

    case 'action': {
      const dataTemplate = readTemplate('action-extension-data.swift');
      const lines = dataTemplate.split('\n');
      const properties: string[] = [];
      const loadMethodLines: string[] = [];
      const propsMethodLines: string[] = [];

      let currentSection: 'properties' | 'load' | 'props' | null = null;

      for (const line of lines) {
        if (line.includes('private var ')) {
          currentSection = 'properties';
          properties.push(line);
        } else if (line.includes('private func loadActionContent()')) {
          currentSection = 'load';
          loadMethodLines.push(line);
        } else if (line.includes('private func getActionDataProps()')) {
          currentSection = 'props';
          propsMethodLines.push(line);
        } else if (
          currentSection === 'properties' &&
          line.trim().startsWith('private')
        ) {
          properties.push(line);
        } else if (currentSection === 'load') {
          loadMethodLines.push(line);
        } else if (currentSection === 'props') {
          propsMethodLines.push(line);
        }
      }

      return {
        properties: properties.join('\n    '),
        loadMethod: `// Load action content before creating React Native view
        Task {
            await loadActionContent()
            // Create React Native view with loaded content
            await MainActor.run {
                let actionData = getActionDataProps()
                setupReactNativeView(with: actionData)
            }
        }`,
        propsMethod:
          loadMethodLines.join('\n') + '\n\n' + propsMethodLines.join('\n'),
      };
    }

    case 'clip': {
      const dataTemplate = readTemplate('clip-extension-data.swift');
      const lines = dataTemplate.split('\n');
      const properties: string[] = [];
      const loadMethodLines: string[] = [];
      const propsMethodLines: string[] = [];

      let currentSection: 'properties' | 'load' | 'props' | null = null;

      for (const line of lines) {
        if (line.includes('private var ')) {
          currentSection = 'properties';
          properties.push(line);
        } else if (line.includes('private func loadClipContent()')) {
          currentSection = 'load';
          loadMethodLines.push(line);
        } else if (line.includes('private func getClipDataProps()')) {
          currentSection = 'props';
          propsMethodLines.push(line);
        } else if (
          currentSection === 'properties' &&
          line.trim().startsWith('private')
        ) {
          properties.push(line);
        } else if (currentSection === 'load') {
          loadMethodLines.push(line);
        } else if (currentSection === 'props') {
          propsMethodLines.push(line);
        }
      }

      return {
        properties: properties.join('\n    '),
        loadMethod: `loadClipContent()
        let clipData = getClipDataProps()
        setupReactNativeView(with: clipData)`,
        propsMethod:
          loadMethodLines.join('\n') + '\n\n' + propsMethodLines.join('\n'),
      };
    }

    case 'messages': {
      const dataTemplate = readTemplate('messages-extension-data.swift');
      const lines = dataTemplate.split('\n');
      const properties: string[] = [];
      const loadMethodLines: string[] = [];
      const propsMethodLines: string[] = [];

      let currentSection: 'properties' | 'load' | 'props' | null = null;

      for (const line of lines) {
        if (line.includes('private var ')) {
          currentSection = 'properties';
          properties.push(line);
        } else if (line.includes('private func loadMessagesContent()')) {
          currentSection = 'load';
          loadMethodLines.push(line);
        } else if (line.includes('private func getMessagesDataProps()')) {
          currentSection = 'props';
          propsMethodLines.push(line);
        } else if (
          currentSection === 'properties' &&
          line.trim().startsWith('private')
        ) {
          properties.push(line);
        } else if (currentSection === 'load') {
          loadMethodLines.push(line);
        } else if (currentSection === 'props') {
          propsMethodLines.push(line);
        }
      }

      return {
        properties: properties.join('\n    '),
        loadMethod: `loadMessagesContent()
        let messagesData = getMessagesDataProps()
        setupReactNativeView(with: messagesData)`,
        propsMethod:
          loadMethodLines.join('\n') + '\n\n' + propsMethodLines.join('\n'),
      };
    }

    default:
      // For other types, no extension-specific data
      return {
        properties: '',
        loadMethod: 'setupReactNativeView(with: nil)',
        propsMethod: '',
      };
  }
}

export function generateMessagesViewController(): string {
  return readTemplate('MessagesViewController.swift');
}

export function generateReactNativeViewController(
  options: ReactNativeViewControllerOptions
): string {
  let baseTemplate = readTemplate('ReactNativeViewController.swift');
  const extensionData = getExtensionDataForType(
    options.type,
    options.preprocessingFile
  );

  // Add Messages import for messages type
  if (options.type === 'messages') {
    baseTemplate = baseTemplate.replace(
      'import ReactAppDependencyProvider',
      'import ReactAppDependencyProvider\nimport Messages'
    );
  }

  // Convert entry path to bundle root for Metro
  // e.g., "./targets/rn-share/index.tsx" -> "targets/rn-share/index"
  let bundleRoot = '.expo/.virtual-metro-entry';
  if (options.entry) {
    bundleRoot = options.entry
      .replace(/^\.\//, '') // Remove leading ./
      .replace(/\.(tsx?|jsx?)$/, ''); // Remove file extension
  }

  // Replace placeholders (use replaceAll to catch multiple occurrences)
  let result = baseTemplate
    .replace(/{{MODULE_NAME}}/g, options.moduleName)
    .replace(/{{TARGET_NAME}}/g, options.targetName)
    .replace(/{{BUNDLE_ROOT}}/g, bundleRoot)
    .replace('{{EXTENSION_DATA_PROPERTIES}}', extensionData.properties)
    .replace('{{LOAD_EXTENSION_DATA}}', extensionData.loadMethod);

  // Add extension data methods if needed
  if (extensionData.propsMethod) {
    const closingBraceIndex = result.lastIndexOf('}');
    result =
      result.slice(0, closingBraceIndex) +
      '\n    // MARK: - Extension Data\n    \n' +
      extensionData.propsMethod +
      '\n' +
      result.slice(closingBraceIndex);
  }

  return result;
}
