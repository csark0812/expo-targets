import { createTarget } from 'expo-targets';
import ShareExpoUiExtension from './src/ShareExpoUiExtension';

export const shareExpoUiTarget = createTarget<'share'>(
  'ShareExpoUi',
  ShareExpoUiExtension
);
