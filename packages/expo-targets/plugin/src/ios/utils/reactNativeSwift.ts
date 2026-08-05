import * as fs from 'node:fs';
import * as path from 'node:path';

import type { ExtensionType } from '../../config';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

export interface ReactNativeViewControllerOptions {
  type: ExtensionType;
  moduleName: string;
  targetName: string;
  preprocessingFile?: string;
  entry?: string;
  appGroup?: string;
  runtimeVersion?: string;
  maxBundleBytes?: number;
}

function readTemplate(filename: string): string {
  const templatePath = path.join(TEMPLATES_DIR, filename);
  return fs.readFileSync(templatePath, 'utf-8');
}

interface ExtensionData {
  properties: string;
  loadMethod: string;
  propsMethod: string;
}

/**
 * How to read one extension type's data template: which Swift functions mark
 * the loader and the props getter, and what the view controller calls to run
 * them. Types absent from this table get no extension-specific data.
 */
interface ExtensionDataSpec {
  templateFile: string;
  loadFunction: string;
  propsFunction: string;
  loadMethod: string;
  supportsPreprocessing?: boolean;
}

const PREPROCESSING_DATA_LOAD = `
        // Load preprocessed web data
        if let jsDict = extensionItem.userInfo?[NSExtensionJavaScriptPreprocessingResultsKey] as? [String: Any] {
            self.preprocessedWebData = jsDict
        }`;

const EXTENSION_DATA_SPECS: Partial<Record<ExtensionType, ExtensionDataSpec>> =
  {
    share: {
      templateFile: 'share-extension-data.swift',
      loadFunction: 'loadSharedContent',
      propsFunction: 'getSharedDataProps',
      supportsPreprocessing: true,
      loadMethod: `// Load shared content before creating React Native view
        Task {
            await loadSharedContent()
            // Create React Native view with loaded content
            await MainActor.run {
                let sharedData = getSharedDataProps()
                setupReactNativeView(with: sharedData)
            }
        }`,
    },
    action: {
      templateFile: 'action-extension-data.swift',
      loadFunction: 'loadActionContent',
      propsFunction: 'getActionDataProps',
      loadMethod: `// Load action content before creating React Native view
        Task {
            await loadActionContent()
            // Create React Native view with loaded content
            await MainActor.run {
                let actionData = getActionDataProps()
                setupReactNativeView(with: actionData)
            }
        }`,
    },
    clip: {
      templateFile: 'clip-extension-data.swift',
      loadFunction: 'loadClipContent',
      propsFunction: 'getClipDataProps',
      loadMethod: `loadClipContent()
        let clipData = getClipDataProps()
        setupReactNativeView(with: clipData)`,
    },
    messages: {
      templateFile: 'messages-extension-data.swift',
      loadFunction: 'loadMessagesContent',
      propsFunction: 'getMessagesDataProps',
      loadMethod: `loadMessagesContent()
        let messagesData = getMessagesDataProps()
        setupReactNativeView(with: messagesData)`,
    },
  };

type TemplateSection = 'properties' | 'load' | 'props';

/**
 * The section a line opens, if it is a marker line.
 */
function sectionForLine(
  line: string,
  spec: ExtensionDataSpec
): TemplateSection | undefined {
  if (line.includes('private var ')) {
    return 'properties';
  }
  if (line.includes(`private func ${spec.loadFunction}()`)) {
    return 'load';
  }
  if (line.includes(`private func ${spec.propsFunction}()`)) {
    return 'props';
  }
}

/**
 * The properties section only accumulates further declarations, while the
 * loader and props sections take every line until the next marker.
 */
function continuesSection(
  current: TemplateSection | null,
  line: string
): boolean {
  if (current === 'properties') {
    return line.trim().startsWith('private');
  }
  return current !== null;
}

/**
 * Split a data template into its property declarations, its loader and its
 * props getter.
 */
function splitTemplateSections(
  template: string,
  spec: ExtensionDataSpec
): Record<TemplateSection, string[]> {
  const sections: Record<TemplateSection, string[]> = {
    properties: [],
    load: [],
    props: [],
  };
  let current: TemplateSection | null = null;

  for (const line of template.split('\n')) {
    const marker = sectionForLine(line, spec);
    if (marker) {
      current = marker;
    } else if (!continuesSection(current, line)) {
      continue;
    }

    if (current) {
      sections[current].push(line);
    }
  }

  return sections;
}

function getExtensionDataForType(
  type: ExtensionType,
  preprocessingFile?: string
): ExtensionData {
  const spec = EXTENSION_DATA_SPECS[type];
  if (!spec) {
    return {
      properties: '',
      loadMethod: 'setupReactNativeView(with: nil)',
      propsMethod: '',
    };
  }

  let template = readTemplate(spec.templateFile);
  if (spec.supportsPreprocessing) {
    template = template.replace(
      '{{PREPROCESSING_DATA_LOAD}}',
      preprocessingFile ? PREPROCESSING_DATA_LOAD : ''
    );
  }

  const sections = splitTemplateSections(template, spec);

  return {
    properties: sections.properties.join('\n    '),
    loadMethod: spec.loadMethod,
    propsMethod: `${sections.load.join('\n')}\n\n${sections.props.join('\n')}`,
  };
}

export function generateMessagesViewController(): string {
  return readTemplate('MessagesViewController.swift');
}

export function generateReactNativeClipApp(): string {
  return readTemplate('ReactNativeClipApp.swift');
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
    .replace(/{{APP_GROUP}}/g, options.appGroup ?? '')
    .replace(/{{RUNTIME_VERSION}}/g, options.runtimeVersion ?? '')
    .replace(
      /{{MAX_BUNDLE_BYTES}}/g,
      String(options.maxBundleBytes ?? 5 * 1024 * 1024)
    )
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
