import { Platform } from 'react-native';

// Android emulator → 10.0.2.2 maps to host. iOS simulator + physical device → Mac's LAN IP.
// If the network changes, run: ipconfig getifaddr en0
export const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3007/api'
    : 'http://172.20.10.2:3007/api';

export const FILE_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3007'
    : 'http://172.20.10.2:3007';

export async function apiRequest(path, options = {}, token = null, timeoutMs = 10000) {
  const headers = {};
  if (options.body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const ctrl   = new AbortController();
  const tId    = setTimeout(() => ctrl.abort(), timeoutMs);
  const signal = options.signal ?? ctrl.signal;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal,
      headers: { ...headers, ...options.headers },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Server error.');
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Server nije dostupan. Proveri internet vezu.');
    throw e;
  } finally {
    clearTimeout(tId);
  }
}
