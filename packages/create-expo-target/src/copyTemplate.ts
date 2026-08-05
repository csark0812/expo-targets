import path from 'node:path';
import fs from 'fs-extra';
import {
  INTENT_UI_TEMPLATE,
  IOS_TEMPLATES,
  TEMPLATE_FILENAMES,
  WALLET_UI_TEMPLATE,
  type WidgetTemplateOptions,
} from './templates/ios';
import {
  getLiveActivityUiTemplate,
  getPerformHookStub,
  getWidgetBundleTemplate,
} from './templates/liveActivity';

export type CopyTemplateOptions = {
  type: string;
  platform: string;
  targetDir: string;
  pascalName: string;
  includeIntentUi?: boolean;
  appGroup?: string;
  includeLiveActivity?: boolean;
  liveActivityAttributesName?: string;
  appIntentHookName?: string;
  appIntentTitle?: string;
  configurableWidget?: boolean;
};

function getGenericStub(type: string, pascalName: string): string {
  return `import Foundation

@objc(${pascalName}Handler)
class ${pascalName}Handler: NSObject {
  // Minimal stub — replace with the Apple extension principal for type "${type}".
}
`;
}

function resolveIosTemplate(
  type: string,
  pascalName: string,
  widgetOptions?: WidgetTemplateOptions
): string {
  const templateFn =
    IOS_TEMPLATES[type] ||
    (type === 'imessage' ? IOS_TEMPLATES.imessage : null);
  if (typeof templateFn === 'function') {
    return templateFn(pascalName, widgetOptions);
  }
  if (typeof templateFn === 'string') {
    return templateFn;
  }
  return getGenericStub(type, pascalName);
}

function getTemplateFilename(type: string): string {
  return TEMPLATE_FILENAMES[type] ?? 'Main.swift';
}

function writeStickersAssets(platformDir: string): void {
  const stickersDir = path.join(platformDir, 'Stickers.xcstickers');
  fs.mkdirSync(stickersDir, { recursive: true });
  fs.writeFileSync(
    path.join(stickersDir, 'Contents.json'),
    JSON.stringify(
      {
        info: {
          version: 1,
          author: 'xcode',
        },
      },
      null,
      2
    )
  );
}

function writeSupplementaryFiles(
  platformDir: string,
  type: string,
  includeIntentUi?: boolean
): void {
  if (type === 'wallet') {
    fs.writeFileSync(
      path.join(platformDir, 'AuthorizationViewController.swift'),
      WALLET_UI_TEMPLATE
    );
  }
  if (type === 'intent' && includeIntentUi) {
    fs.writeFileSync(
      path.join(platformDir, 'IntentViewController.swift'),
      INTENT_UI_TEMPLATE
    );
  }
  if (type === 'imessage') {
    writeStickersAssets(platformDir);
  }
}

function writeAppIntentFiles(options: CopyTemplateOptions): void {
  if (options.type !== 'app-intent' || options.platform !== 'ios') return;
  const platformDir = path.join(options.targetDir, options.platform);
  const hookName =
    options.appIntentHookName ?? `${options.pascalName}IntentPerform`;
  const title = options.appIntentTitle ?? options.pascalName;
  const appGroup = options.appGroup ?? 'group.com.example.app';

  fs.writeFileSync(
    path.join(platformDir, 'AppIntentExtension.swift'),
    `import AppIntents

/// Empty AppIntentsExtension — pluginkit appintents-extension proof.
/// Host Shortcuts intents are CNG-generated; fill in ${hookName}.swift.
@main
struct ${options.pascalName}Extension: AppIntentsExtension {}
`
  );

  fs.writeFileSync(
    path.join(platformDir, `${hookName}.swift`),
    getPerformHookStub(hookName, title, appGroup)
  );
}

function writeLiveActivityFiles(options: CopyTemplateOptions): void {
  if (
    options.type !== 'widget' ||
    options.platform !== 'ios' ||
    !options.includeLiveActivity
  ) {
    return;
  }
  const platformDir = path.join(options.targetDir, options.platform);
  const attributesName =
    options.liveActivityAttributesName ?? `${options.pascalName}Attributes`;

  fs.writeFileSync(
    path.join(platformDir, 'LiveActivity.swift'),
    getLiveActivityUiTemplate({
      attributesName,
      widgetName: options.pascalName,
    })
  );

  fs.writeFileSync(
    path.join(platformDir, `${options.pascalName}Bundle.swift`),
    getWidgetBundleTemplate({
      pascalName: options.pascalName,
      includeLiveActivity: true,
    }).trimStart()
  );
}

export function copyTemplate(options: CopyTemplateOptions): void {
  const platformDir = path.join(options.targetDir, options.platform);
  fs.mkdirSync(platformDir, { recursive: true });

  // app-intent uses dedicated extension + perform-hook files (no generic Main.swift)
  if (options.type !== 'app-intent') {
    const widgetOptions: WidgetTemplateOptions | undefined =
      options.type === 'widget'
        ? {
            appGroup: options.appGroup ?? 'group.com.example.app',
            useBundle: Boolean(options.includeLiveActivity),
            configurable: Boolean(options.configurableWidget),
          }
        : undefined;

    const template = resolveIosTemplate(
      options.type,
      options.pascalName,
      widgetOptions
    );
    const filename = getTemplateFilename(options.type);
    fs.writeFileSync(path.join(platformDir, filename), template);
  }

  writeSupplementaryFiles(platformDir, options.type, options.includeIntentUi);
  writeLiveActivityFiles(options);
  writeAppIntentFiles(options);
}
