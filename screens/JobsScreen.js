import { View } from 'react-native';
import WebView from 'react-native-webview';

export default function JobsScreen() {
  const url = `https://www.daalohas.com/ops/housekeeping`;

  return (
    <View style={{ flex: 1 }}>
      <WebView source={{ uri: url }} style={{ flex: 1 }} />
    </View>
  );
}
