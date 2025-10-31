import { AppRegistry } from 'react-native';
import { createTarget } from 'expo-targets';
import ShareExtension from './src/ShareExtension';
import Constants from 'expo-constants';

console.log(JSON.stringify(Constants, null, 2));

export const rnShareTarget = createTarget('RNShare');

AppRegistry.registerComponent('RNShareTarget', () => ShareExtension);
