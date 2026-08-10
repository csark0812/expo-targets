import type { PromptObject } from 'prompts';

const TYPE_CHOICES = [
  { title: 'Share Extension', value: 'share' },
  { title: 'Action Extension', value: 'action' },
  { title: 'App Clip', value: 'clip' },
  { title: 'Messages App', value: 'messages' },
  {
    title: 'iMessage Stickers (writes type: stickers)',
    value: 'imessage',
  },
  { title: 'Wallet Extension', value: 'wallet' },
  { title: 'Siri Intent', value: 'intent' },
  {
    title: 'Widget / Live Activity (WidgetKit)',
    value: 'widget',
  },
  { title: 'Notification Service', value: 'notification-service' },
  { title: 'Notification Content', value: 'notification-content' },
  { title: 'Safari Web Extension', value: 'safari' },
  { title: 'Content Blocker', value: 'content-blocker' },
  { title: 'App Intent', value: 'app-intent' },
  { title: 'Keyboard', value: 'keyboard' },
  { title: 'Photo Editing', value: 'photo-editing' },
  { title: 'File Provider', value: 'file-provider' },
  { title: 'Broadcast Upload', value: 'broadcast-upload' },
  { title: 'Call Directory', value: 'call-directory' },
  { title: 'Credentials Provider', value: 'credentials-provider' },
];

const RN_PROMPT_TYPES = [
  'share',
  'action',
  'clip',
  'messages',
  'notification-content',
  'safari',
];

const WIDGET_PROMPT_QUESTIONS: PromptObject[] = [
  {
    type: (_prev, values) => (values.type === 'widget' ? 'select' : null),
    name: 'widgetUi',
    message: 'Widget UI mode?',
    choices: [
      {
        title: 'native — SwiftUI / Glance deepen',
        value: 'native',
      },
      {
        title: 'expo-ui — Layout sandbox (@expo/ui + entry)',
        value: 'expo-ui',
      },
    ],
    initial: 0,
  },
  {
    type: (_prev, values) => (values.type === 'widget' ? 'confirm' : null),
    name: 'configurableWidget',
    message: 'Configurable (Edit Widget)?',
    initial: false,
  },
  {
    type: (_prev, values) => (values.type === 'widget' ? 'confirm' : null),
    name: 'includeLiveActivity',
    message: 'Include Live Activity (ActivityKit) bootstrap?',
    initial: false,
  },
];

export function getTargetPromptQuestions(): PromptObject[] {
  return [
    {
      type: 'select',
      name: 'type',
      message: 'What type of target?',
      choices: TYPE_CHOICES,
    },
    {
      type: 'text',
      name: 'name',
      message: 'Target name (e.g., my-share):',
      validate: (value) =>
        value.length > 0 ? true : 'Target name is required',
    },
    {
      type: 'multiselect',
      name: 'platforms',
      message: 'Select platforms:',
      choices: [
        { title: 'iOS', value: 'ios', selected: true },
        {
          title: 'Android (widgets → system services)',
          value: 'android',
        },
      ],
    },
    {
      type: (_prev, values) =>
        RN_PROMPT_TYPES.includes(values.type) ? 'confirm' : null,
      name: 'useReactNative',
      message: 'Use React Native for UI?',
      initial: true,
    },
    {
      type: (_prev, values) => (values.type === 'intent' ? 'confirm' : null),
      name: 'includeIntentUI',
      message: 'Include custom UI extension? (displays custom visuals in Siri)',
      initial: true,
    },
    ...WIDGET_PROMPT_QUESTIONS,
  ];
}
