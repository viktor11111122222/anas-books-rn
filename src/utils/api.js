import { Platform } from 'react-native';

// Android emulator → 10.0.2.2 maps to host. iOS simulator + physical device → Mac's LAN IP.
// If the network changes, run: ipconfig getifaddr en0
export const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000/api'
    : 'http://172.20.10.2:3000/api';

export async function apiRequest(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Server error.');
  return data;
}
