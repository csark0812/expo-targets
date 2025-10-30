import { AppRegistry } from 'react-native';
import { createTarget } from 'expo-targets';
import ShareExtension from './ShareExtension';

export const rnShareTarget = createTarget('RNShare');

// Register the React Native component with the moduleName expected by Swift
AppRegistry.registerComponent('RNShareTarget', () => ShareExtension);

export default ShareExtension;
