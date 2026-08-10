import * as fs from 'node:fs';
import * as path from 'node:path';

function loadTemplate(name: string): string {
  return fs.readFileSync(path.join(__dirname, '../templates', name), 'utf8');
}

export function generateExpoUiWidgetSwift(options: {
  name: string;
  displayName?: string;
  description?: string;
}): string {
  const displayName = JSON.stringify(options.displayName ?? options.name);
  const description = JSON.stringify(
    options.description ?? `${options.name} (expo-ui)`
  );
  return loadTemplate('ExpoUiWidget.swift')
    .split('{{NAME}}')
    .join(options.name)
    .split('{{DISPLAY_NAME}}')
    .join(displayName)
    .split('{{DESCRIPTION}}')
    .join(description);
}

export function generateExpoUiWidgetBundleSwift(options: {
  name: string;
}): string {
  return loadTemplate('ExpoUiWidgetBundle.swift')
    .split('{{NAME}}')
    .join(options.name);
}
