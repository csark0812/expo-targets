import { registerRootComponent } from 'expo';
import { Text, View } from 'react-native';

function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Test Widget App</Text>
    </View>
  );
}

registerRootComponent(App);
