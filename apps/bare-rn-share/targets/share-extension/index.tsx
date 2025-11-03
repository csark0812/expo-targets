import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension';

export const shareExtensionTarget = createTarget<'share'>('ShareExtension', ShareExtension);

