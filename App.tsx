import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';

import StackNavigator from './navigation/StackNavigator';
import { store } from './redux/Store';
import { setOnUnauthorized } from './utils/api';
import { jwtDecode } from 'jwt-decode';


export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const isLoggingOutRef = useRef(false);

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
        await AsyncStorage.multiRemove(['token', 'user', 'mobile']);
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
    (async () => {
      await validateToken();
      setLoading(false);
    })();

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') validateToken();
    });

    return () => sub.remove();
  }, []);

  // ✅ FIXED logout handler (single source of truth)
  useEffect(() => {
    setOnUnauthorized(async () => {
      if (isLoggingOutRef.current) return;

      isLoggingOutRef.current = true;

      await AsyncStorage.multiRemove(['token', 'user', 'mobile']);

      setIsLoggedIn(false);

      setTimeout(() => {
        isLoggingOutRef.current = false;
      }, 1000);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <NavigationContainer>
        <StackNavigator
          isLoggedIn={isLoggedIn}
          setIsLoggedIn={setIsLoggedIn}
        />
      </NavigationContainer>
    </Provider>
  );
}