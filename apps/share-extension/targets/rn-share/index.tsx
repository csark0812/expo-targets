import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension';

export const rnShareTarget = createTarget<'share'>('RNShare', ShareExtension);
