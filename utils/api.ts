import AsyncStorage from '@react-native-async-storage/async-storage';

let onUnauthorized: null | (() => void) = null;

export const setOnUnauthorized = (fn: () => void) => {
  onUnauthorized = fn;
};

let isLoggingOut = false;

export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  try {
    const token = await AsyncStorage.getItem('token');

    console.log('TOKEN FROM STORAGE =>', token);

    const headers: any = {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      ...(token
        ? {
            Authorization: `Bearer ${token.trim()}`, // ✅ FIX HERE
          }
        : {}),
    };

    console.log('AUTH HEADER =>', token ? `Bearer ${token.trim()}` : 'NO TOKEN');

    const response = await fetch(input as any, {
      ...init,
      headers,
    });

    if (response.status === 401) {
      console.log('401 API URL =>', input);
    }

    if (response.status === 401 && token && !isLoggingOut) {
      isLoggingOut = true;

      console.log('Session expired');

      await AsyncStorage.multiRemove(['token', 'user', 'mobile']);

      onUnauthorized?.();

      setTimeout(() => {
        isLoggingOut = false;
      }, 1000);
    }

    return response;
  } catch (error) {
    console.log('API ERROR =>', error);
    throw error;
  }
}