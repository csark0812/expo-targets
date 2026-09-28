import { registerRootComponent } from 'expo';
import App from './App';

// Android share activities reuse the host's Release bundle. Register the
// second RN-backed target even though the host UI reads state through the
// primary Share target imported by App.
import './targets/share-expo-ui';

registerRootComponent(App);
