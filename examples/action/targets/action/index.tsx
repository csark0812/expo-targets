import { createTarget } from 'expo-targets';
import ActionExtension from './src/ActionExtension';

export const actionTarget = createTarget<'action'>('Action', ActionExtension);
