// App.tsx
import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import StackNavigator from './navigation/StackNavigator';
import { store } from './redux/Store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  View,
  AppState,
  AppStateStatus,
} from 'react-native';
import { jwtDecode } from 'jwt-decode';
import { setOnUnauthorized } from './utils/api';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const validateToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setIsLoggedIn(false);
        return;
      }
      const decoded: any = jwtDecode(token);
      const now = Date.now() / 1000;
      if (!decoded?.exp || decoded.exp <= now) {
        await AsyncStorage.removeItem('token');
        setIsLoggedIn(false);
      } else {
        setIsLoggedIn(true);
      }
    } catch (e) {
      console.log('Token check error:', e);
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    // initial check
    (async () => {
      await validateToken();
      setLoading(false);
    })();

    // re-check when app comes to foreground
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') validateToken();
    });

    // re-check every 60s (lightweight; adjust if you want)
    intervalRef.current = setInterval(validateToken, 60_000);

    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      setIsLoggedIn(false);
    });
  }, []);
  

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <NavigationContainer>
        <StackNavigator isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      </NavigationContainer>
    </Provider>
  );
}
