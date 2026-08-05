import path from 'node:path';
import process from 'node:process';
import fs from 'fs-extra';
import prompts from 'prompts';
import { copyTemplate } from './copyTemplate';
import { generateConfig } from './generateConfig';
import { getTargetPromptQuestions } from './prompts';
import { getReactNativeTemplate } from './reactNativeTemplate';
import { resolveAppGroup } from './resolveAppGroup';
import { kebabToPascal, pascalToCamel } from './utils';

type TargetPromptResponse = {
  type?: string;
  name?: string;
  platforms: string[];
  useReactNative?: boolean;
  includeIntentUI?: boolean;
  includeLiveActivity?: boolean;
};

function writeHostHelper(targetDir: string, pascalName: string): void {
  const indexTs = `import { createTarget } from 'expo-targets';

export const ${pascalToCamel(pascalName)} = createTarget('${pascalName}');
`;
  fs.writeFileSync(path.join(targetDir, 'index.ts'), indexTs);
}

function writeIosFiles(options: {
  targetDir: string;
  response: TargetPromptResponse;
  pascalName: string;
  appGroup: string;
}): void {
  const { targetDir, response, pascalName, appGroup } = options;
  if (!response.platforms.includes('ios')) {
    return;
  }

  const attributesName = `${pascalName}Attributes`;
  const appIntentHookName = `${pascalName}IntentPerform`;

  copyTemplate({
    type: response.type ?? '',
    platform: 'ios',
    targetDir,
    pascalName,
    includeIntentUi: response.includeIntentUI,
    appGroup,
    includeLiveActivity: response.includeLiveActivity,
    liveActivityAttributesName: attributesName,
    appIntentHookName,
    appIntentTitle: pascalName,
  });

  if (response.useReactNative) {
    const entryFile = path.join(targetDir, 'index.tsx');
    fs.writeFileSync(
      entryFile,
      getReactNativeTemplate(response.type ?? '', pascalName)
    );
  }
}

export async function scaffoldTarget(): Promise<void> {
  const response = (await prompts(
    getTargetPromptQuestions()
  )) as TargetPromptResponse;

  if (!(response.type && response.name)) {
    return;
  }

  const targetDir = path.join(process.cwd(), 'targets', response.name);
  if (fs.existsSync(targetDir)) {
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const pascalName = kebabToPascal(response.name);
  const appGroup = resolveAppGroup(process.cwd());
  const config = generateConfig({
    type: response.type,
    kebabName: response.name,
    pascalName,
    platforms: response.platforms,
    useReactNative: response.useReactNative,
    includeIntentUi: response.includeIntentUI,
    appGroup,
    includeLiveActivity: response.includeLiveActivity,
    liveActivityAttributesName: `${pascalName}Attributes`,
  });
  fs.writeFileSync(path.join(targetDir, 'expo-target.config.json'), config);

  writeIosFiles({ targetDir, response, pascalName, appGroup });

  if (!response.useReactNative) {
    writeHostHelper(targetDir, pascalName);
  }
}
