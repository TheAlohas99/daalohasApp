import WebView from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

export default function GuestManagementApp() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('token').then(setToken);
  }, []);

  if (!token) return null;

  return (
    <WebView
      source={{
        uri: 'https://www.daalohas.com/guest-management-app',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }}
      style={{ flex: 1 }}
    />
  );
}