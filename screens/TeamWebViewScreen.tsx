import React, { Component } from 'react';
import { WebView } from 'react-native-webview';

// ...
export const TeamWebViewScreen = () => {
  return <WebView source={{ uri: 'https://www.daalohas.com/our-team' }} style={{ flex: 1 }} />;
}