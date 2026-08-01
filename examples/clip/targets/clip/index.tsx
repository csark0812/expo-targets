import { createTarget } from 'expo-targets';
import ClipExtension from './src/ClipExtension';

export const clipTarget = createTarget<'clip'>('Clip', ClipExtension);
