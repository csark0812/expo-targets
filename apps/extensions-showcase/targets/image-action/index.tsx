import { createTarget } from 'expo-targets';
import ImageActionExtension from './src/ImageActionExtension';

export const imageActionTarget = createTarget<'action'>(
  'ImageAction',
  ImageActionExtension
);
