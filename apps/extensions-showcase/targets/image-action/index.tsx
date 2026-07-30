import { createTarget } from 'expo-targets';
import ImageActionExtension from './src/ImageActionExtension.tsx';

export const imageActionTarget = createTarget<'action'>(
  'ImageAction',
  ImageActionExtension
);
