import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from '../utils/api';

const TOKEN_KEY        = 'auth_token';
const USER_KEY         = 'auth_user';
const WISHLIST_IDS_KEY = 'wishlist_ids';
const WISHLIST_BOOKS_KEY = 'wishlist_books';
const LIBRARY_IDS_KEY  = 'library_ids';
const LIBRARY_BOOKS_KEY = 'library_books';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [userSession,       setUserSession]       = useState(null);
  const [profile,           setProfile]           = useState(null);
  const [wishlistIds,       setWishlistIdsState]  = useState(new Set());
  const [wishlistBooks,     setWishlistBooksState] = useState([]);
  const [libraryIds,        setLibraryIdsState]   = useState(new Set());
  const [libraryBooks,      setLibraryBooksState] = useState([]);
  const [isLoading,         setIsLoading]         = useState(false);
  const [errorMessage,      setErrorMessage]      = useState(null);
  const [resetEmailSent,    setResetEmailSent]    = useState(false);
  const [bootstrapped,      setBootstrapped]      = useState(false);

  // ── Persisted setters ────────────────────────────────────────────────────────

  const setWishlistIds = useCallback((ids) => {
    setWishlistIdsState(ids);
    AsyncStorage.setItem(WISHLIST_IDS_KEY, JSON.stringify([...ids]));
  }, []);

  const setWishlistBooks = useCallback((books) => {
    setWishlistBooksState(books);
    AsyncStorage.setItem(WISHLIST_BOOKS_KEY, JSON.stringify(books));
  }, []);

  const setLibraryIds = useCallback((ids) => {
    setLibraryIdsState(ids);
    AsyncStorage.setItem(LIBRARY_IDS_KEY, JSON.stringify([...ids]));
  }, []);

  const setLibraryBooks = useCallback((books) => {
    setLibraryBooksState(books);
    AsyncStorage.setItem(LIBRARY_BOOKS_KEY, JSON.stringify(books));
  }, []);

  // ── Server sync helper ────────────────────────────────────────────────────────
  // Fetches wishlist + library from server and replaces local state.
  // Called right after login / register so data is fresh immediately.

  async function syncAllFromServer(token) {
    try {
      const [wishlistData, libraryData] = await Promise.all([
        apiRequest('/wishlist', {}, token),
        apiRequest('/library',  {}, token),
      ]);
      setWishlistIds(new Set(wishlistData.map(b => b.id)));
      setWishlistBooks(wishlistData);
      setLibraryIds(new Set(libraryData.map(b => b.id)));
      setLibraryBooks(libraryData);
    } catch {}
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function bootstrap() {
      try {
        const [token, userRaw, idsRaw, booksRaw, libIdsRaw, libBooksRaw] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
          AsyncStorage.getItem(WISHLIST_IDS_KEY),
          AsyncStorage.getItem(WISHLIST_BOOKS_KEY),
          AsyncStorage.getItem(LIBRARY_IDS_KEY),
          AsyncStorage.getItem(LIBRARY_BOOKS_KEY),
        ]);

        if (token && userRaw) {
          // Validate token is still accepted by server
          try {
            await apiRequest('/auth/me', {}, token);
            setUserSession(JSON.parse(userRaw));
            // Restore cached local data immediately
            if (idsRaw)      setWishlistIdsState(new Set(JSON.parse(idsRaw)));
            if (booksRaw)    setWishlistBooksState(JSON.parse(booksRaw));
            if (libIdsRaw)   setLibraryIdsState(new Set(JSON.parse(libIdsRaw)));
            if (libBooksRaw) setLibraryBooksState(JSON.parse(libBooksRaw));
            // Sync fresh data from server in background
            syncAllFromServer(token);
          } catch {
            // Token expired or rejected — clear everything
            await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
            await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
            await AsyncStorage.multiRemove([
              WISHLIST_IDS_KEY, WISHLIST_BOOKS_KEY,
              LIBRARY_IDS_KEY, LIBRARY_BOOKS_KEY,
            ]);
          }
        }
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

  // ── Auth ──────────────────────────────────────────────────────────────────────

  async function signIn(email, password) {
    email = email.trim().toLowerCase();
    if (!email)    { setErrorMessage('Unesite email adresu.'); return; }
    if (!password) { setErrorMessage('Unesite lozinku.'); return; }
    setIsLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await saveSession(data.token, data.user);
      setUserSession(data.user);
      // Sync wishlist + library right after login
      syncAllFromServer(data.token);
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function signUp(email, password, confirmPassword, displayName) {
    email = email.trim().toLowerCase();
    displayName = displayName?.trim() ?? '';
    if (!displayName)                 { setErrorMessage('Unesite ime ili nadimak.'); return; }
    if (displayName.length > 30)      { setErrorMessage('Ime može imati najviše 30 karaktera.'); return; }
    if (!email)                       { setErrorMessage('Unesite email adresu.'); return; }
    if (password.length < 6)          { setErrorMessage('Lozinka mora imati najmanje 6 karaktera.'); return; }
    if (password !== confirmPassword) { setErrorMessage('Lozinke se ne poklapaju.'); return; }
    setIsLoading(true);
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      await saveSession(data.token, data.user);
      setUserSession(data.user);
      syncAllFromServer(data.token);
    } catch (e) {
      setErrorMessage(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateDisplayName(name) {
    name = name?.trim() ?? '';
    if (!name)         { setErrorMessage('Unesite ime ili nadimak.'); return false; }
    if (name.length > 30) { setErrorMessage('Ime može imati najviše 30 karaktera.'); return false; }
    setIsLoading(true);
    try {
      const token = await getToken();
      await apiRequest('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: name }),
      }, token);
      const updatedUser = { ...userSession, display_name: name };
      setUserSession(updatedUser);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser));
      setProfile(prev => prev ? { ...prev, display_name: name } : prev);
      return true;
    } catch (e) {
      setErrorMessage(e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    await AsyncStorage.multiRemove([
      WISHLIST_IDS_KEY, WISHLIST_BOOKS_KEY,
      LIBRARY_IDS_KEY,  LIBRARY_BOOKS_KEY,
    ]);
    setUserSession(null);
    setProfile(null);
    setWishlistIdsState(new Set());
    setWishlistBooksState([]);
    setLibraryIdsState(new Set());
    setLibraryBooksState([]);
  }

  async function resetPassword(email) {
    email = email.trim().toLowerCase();
    if (!email) { setErrorMessage('Unesite email adresu.'); return; }
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
    if (newPwd !== confirm)  { setErrorMessage('Lozinke se ne poklapaju.'); return false; }
    if (newPwd.length < 6)   { setErrorMessage('Lozinka mora imati najmanje 6 karaktera.'); return false; }
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

  // ── Wishlist ──────────────────────────────────────────────────────────────────

  async function toggleWishlist(bookId, { title, author, coverUrl, minPrice, storeCount } = {}) {
    if (!userSession) return;
    const wasIn = wishlistIds.has(bookId);
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
      setWishlistIds(new Set(serverBooks.map(b => b.id)));
      setWishlistBooks(serverBooks);
    } catch {}
  }

  // ── Library ───────────────────────────────────────────────────────────────────

  async function toggleLibrary(bookId, { title, author, coverUrl, minPrice } = {}) {
    if (!userSession) return;
    const wasIn = libraryIds.has(bookId);
    const newIds = new Set(libraryIds);
    let newBooks = [...libraryBooks];
    if (wasIn) {
      newIds.delete(bookId);
      newBooks = newBooks.filter(b => b.id !== bookId);
    } else {
      newIds.add(bookId);
      if (title && author) {
        newBooks = [{ id: bookId, title, author, cover_url: coverUrl, min_price: minPrice, added_at: null }, ...newBooks];
      }
    }
    setLibraryIds(newIds);
    setLibraryBooks(newBooks);
    try {
      const token = await getToken();
      if (wasIn) {
        await apiRequest(`/library/${bookId}`, { method: 'DELETE' }, token);
      } else {
        await apiRequest(`/library/${bookId}`, { method: 'POST', body: JSON.stringify({}) }, token);
      }
    } catch {}
  }

  async function syncLibrary() {
    if (!userSession) return;
    try {
      const token = await getToken();
      const serverBooks = await apiRequest('/library', {}, token);
      setLibraryIds(new Set(serverBooks.map(b => b.id)));
      setLibraryBooks(serverBooks);
    } catch {}
  }

  function clearError() { setErrorMessage(null); }

  // Show a blank loading screen while reading SecureStore — prevents flash of auth screen
  if (!bootstrapped) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F7F7FC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7C5CBF" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{
      userSession, profile,
      wishlistIds, wishlistBooks,
      libraryIds, libraryBooks,
      isLoading, errorMessage, resetEmailSent,
      signIn, signUp, signOut, resetPassword,
      fetchMe, changePassword, updateDisplayName,
      toggleWishlist, syncWishlist,
      toggleLibrary, syncLibrary,
      clearError, setResetEmailSent,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
