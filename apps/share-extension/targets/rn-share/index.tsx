import { AppRegistry } from 'react-native';
import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension';

export const rnShareTarget = createTarget('RNShare');

AppRegistry.registerComponent('RNShareTarget', () => ShareExtension);
