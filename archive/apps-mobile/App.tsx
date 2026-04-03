import React from 'react';
import { StyleSheet, View, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

// In development, you might point this to your local IP running Hypercode (e.g. http://192.168.1.100:3000)
// For production, this should point to your live Hypercode deployment URL.
const HYPERCODE_DASHBOARD_URL = 'http://localhost:3000';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <WebView
        source={{ uri: HYPERCODE_DASHBOARD_URL }}
        style={styles.webview}
        // Enable iOS features for seamless PWA-like appearance
        allowsInlineMediaPlayback={true}
        bounces={false}
        // Inject script to ensure viewport is configured perfectly for the mobile app
        injectedJavaScript={`
          const meta = document.createElement('meta');
          meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
          meta.setAttribute('name', 'viewport');
          document.getElementsByTagName('head')[0].appendChild(meta);
          true;
        `}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // Add safe area padding specifically for iOS to avoid the notch
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  webview: {
    flex: 1,
  },
});
