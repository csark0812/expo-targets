import * as fs from 'fs';
import * as path from 'path';

import type { ExtensionType } from '../../config';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

export interface ReactNativeViewControllerOptions {
  type: ExtensionType;
  moduleName: string;
  preprocessingFile?: string;
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
        loadMethod: 'loadSharedContent()',
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
        loadMethod: 'loadActionContent()',
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
        loadMethod: 'loadClipContent()',
        propsMethod:
          loadMethodLines.join('\n') + '\n\n' + propsMethodLines.join('\n'),
      };
    }

    default:
      // For other types, no extension-specific data
      return {
        properties: '',
        loadMethod: '// No extension data to load',
        propsMethod: '',
      };
  }
}

export function generateReactNativeViewController(
  options: ReactNativeViewControllerOptions
): string {
  const baseTemplate = readTemplate('ReactNativeViewController.swift');
  const extensionData = getExtensionDataForType(
    options.type,
    options.preprocessingFile
  );

  // Build initial properties
  let initialProps = '';
  if (extensionData.propsMethod) {
    if (options.type === 'share') {
      initialProps = `let sharedData = getSharedDataProps()
        props.merge(sharedData) { (_, new) in new }`;
    } else if (options.type === 'action') {
      initialProps = `let actionData = getActionDataProps()
        props.merge(actionData) { (_, new) in new }`;
    } else if (options.type === 'clip') {
      initialProps = `let clipData = getClipDataProps()
        props.merge(clipData) { (_, new) in new }`;
    }
  }

  // Replace placeholders
  let result = baseTemplate
    .replace('{{MODULE_NAME}}', options.moduleName)
    .replace('{{EXTENSION_DATA_PROPERTIES}}', extensionData.properties)
    .replace('{{LOAD_EXTENSION_DATA}}', extensionData.loadMethod)
    .replace('{{INITIAL_PROPERTIES}}', initialProps);

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
