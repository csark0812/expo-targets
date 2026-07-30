import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension';

export const shareTarget = createTarget<'share'>('Share', ShareExtension);
