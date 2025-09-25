// utils/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

let onUnauthorized: null | (() => void) = null;
export const setOnUnauthorized = (fn: () => void) => (onUnauthorized = fn);

function withBearer(token: string) {
  if (!token) return "";
  return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
}

export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = await AsyncStorage.getItem("token");
  const headers = {
    ...(init.headers || {}),
    "Content-Type": "application/json",
    ...(token ? { Authorization: withBearer(token) } : {}),
  };

  const res = await fetch(input as any, { ...init, headers });

  if (res.status === 401) {
    // server says token invalid/expired
    await AsyncStorage.removeItem("token");
    if (onUnauthorized) onUnauthorized();
    throw new Error("Unauthorized");
  }

  return res;
}
