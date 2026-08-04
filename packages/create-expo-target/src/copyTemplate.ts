import path from 'node:path';
import fs from 'fs-extra';
import {
  INTENT_UI_TEMPLATE,
  IOS_TEMPLATES,
  TEMPLATE_FILENAMES,
  WALLET_UI_TEMPLATE,
} from './templates/ios';

export type CopyTemplateOptions = {
  type: string;
  platform: string;
  targetDir: string;
  pascalName: string;
  includeIntentUi?: boolean;
};

function getGenericStub(type: string, pascalName: string): string {
  return `import Foundation

@objc(${pascalName}Handler)
class ${pascalName}Handler: NSObject {
  // Minimal stub — replace with the Apple extension principal for type "${type}".
}
`;
}

function resolveIosTemplate(type: string, pascalName: string): string {
  const templateFn =
    IOS_TEMPLATES[type] ||
    (type === 'imessage' ? IOS_TEMPLATES.imessage : null);
  if (typeof templateFn === 'function') {
    return templateFn(pascalName);
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

export function copyTemplate(options: CopyTemplateOptions): void {
  const platformDir = path.join(options.targetDir, options.platform);
  fs.mkdirSync(platformDir, { recursive: true });

  const template = resolveIosTemplate(options.type, options.pascalName);
  const filename = getTemplateFilename(options.type);
  fs.writeFileSync(path.join(platformDir, filename), template);

  writeSupplementaryFiles(platformDir, options.type, options.includeIntentUi);
}
