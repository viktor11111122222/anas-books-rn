import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from '../utils/api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const WISHLIST_IDS_KEY = 'wishlist_ids';
const WISHLIST_BOOKS_KEY = 'wishlist_books';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [userSession, setUserSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [wishlistIds, setWishlistIdsState] = useState(new Set());
  const [wishlistBooks, setWishlistBooksState] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  // Persist wishlistIds whenever it changes
  const setWishlistIds = useCallback((ids) => {
    setWishlistIdsState(ids);
    AsyncStorage.setItem(WISHLIST_IDS_KEY, JSON.stringify([...ids]));
  }, []);

  const setWishlistBooks = useCallback((books) => {
    setWishlistBooksState(books);
    AsyncStorage.setItem(WISHLIST_BOOKS_KEY, JSON.stringify(books));
  }, []);

  // Load persisted session + wishlist on mount
  useEffect(() => {
    async function bootstrap() {
      try {
        const [token, userRaw, idsRaw, booksRaw] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
          AsyncStorage.getItem(WISHLIST_IDS_KEY),
          AsyncStorage.getItem(WISHLIST_BOOKS_KEY),
        ]);
        if (token && userRaw) {
          setUserSession(JSON.parse(userRaw));
        }
        if (idsRaw) setWishlistIdsState(new Set(JSON.parse(idsRaw)));
        if (booksRaw) setWishlistBooksState(JSON.parse(booksRaw));
      } catch {}
      setBootstrapped(true);
    }
    bootstrap();
  }, []);

  async function getToken() {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  async function saveSession(token, user) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  }

  // --- Auth ---

  async function signIn(email, password) {
    email = email.trim().toLowerCase();
    if (!email) { setErrorMessage('Please enter your email address.'); return; }
    if (!password) { setErrorMessage('Please enter your password.'); return; }
    setIsLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await saveSession(data.token, data.user);
      setUserSession(data.user);
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function signUp(email, password, confirmPassword) {
    email = email.trim().toLowerCase();
    if (!email) { setErrorMessage('Please enter your email address.'); return; }
    if (password.length < 6) { setErrorMessage('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setErrorMessage('Passwords do not match.'); return; }
    setIsLoading(true);
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await saveSession(data.token, data.user);
      setUserSession(data.user);
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    await AsyncStorage.multiRemove([WISHLIST_IDS_KEY, WISHLIST_BOOKS_KEY]);
    setUserSession(null);
    setProfile(null);
    setWishlistIdsState(new Set());
    setWishlistBooksState([]);
  }

  async function resetPassword(email) {
    email = email.trim().toLowerCase();
    if (!email) { setErrorMessage('Please enter your email address.'); return; }
    setIsLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setResetEmailSent(true);
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchMe() {
    if (!userSession) return;
    try {
      const token = await getToken();
      const p = await apiRequest('/auth/me', {}, token);
      setProfile(p);
    } catch {}
  }

  async function changePassword(current, newPwd, confirm) {
    if (newPwd !== confirm) { setErrorMessage('Lozinke se ne poklapaju.'); return false; }
    if (newPwd.length < 6) { setErrorMessage('Lozinka mora imati najmanje 6 karaktera.'); return false; }
    setIsLoading(true);
    try {
      const token = await getToken();
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: newPwd }),
      }, token);
      return true;
    } catch (e) {
      setErrorMessage(e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  // --- Wishlist ---

  async function toggleWishlist(bookId, { title, author, coverUrl, minPrice, storeCount } = {}) {
    if (!userSession) return;
    const wasIn = wishlistIds.has(bookId);

    // Optimistic update
    const newIds = new Set(wishlistIds);
    let newBooks = [...wishlistBooks];
    if (wasIn) {
      newIds.delete(bookId);
      newBooks = newBooks.filter(b => b.id !== bookId);
    } else {
      newIds.add(bookId);
      if (title && author) {
        newBooks = [{ id: bookId, title, author, cover_url: coverUrl, min_price: minPrice, store_count: storeCount, added_at: null }, ...newBooks];
      }
    }
    setWishlistIds(newIds);
    setWishlistBooks(newBooks);

    // Fire-and-forget server sync
    try {
      const token = await getToken();
      if (wasIn) {
        await apiRequest(`/wishlist/${bookId}`, { method: 'DELETE' }, token);
      } else {
        await apiRequest(`/wishlist/${bookId}`, { method: 'POST', body: JSON.stringify({}) }, token);
      }
    } catch {}
  }

  async function syncWishlist() {
    if (!userSession) return;
    try {
      const token = await getToken();
      const serverBooks = await apiRequest('/wishlist', {}, token);
      const serverIds = new Set(serverBooks.map(b => b.id));

      const localOnly = wishlistBooks.filter(b => !serverIds.has(b.id));
      const merged = [...serverBooks, ...localOnly];
      setWishlistIds(new Set(merged.map(b => b.id)));
      setWishlistBooks(merged);

      // Push offline additions
      for (const book of localOnly) {
        apiRequest(`/wishlist/${book.id}`, { method: 'POST', body: JSON.stringify({}) }, token).catch(() => {});
      }
    } catch {}
  }

  function clearError() {
    setErrorMessage(null);
  }

  if (!bootstrapped) return null;

  return (
    <AuthContext.Provider value={{
      userSession, profile, wishlistIds, wishlistBooks,
      isLoading, errorMessage, resetEmailSent,
      signIn, signUp, signOut, resetPassword,
      fetchMe, changePassword,
      toggleWishlist, syncWishlist,
      clearError, setResetEmailSent,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
