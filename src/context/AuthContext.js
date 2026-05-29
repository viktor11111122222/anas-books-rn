import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SplashScreen } from '../screens/SplashScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, BASE_URL, FILE_BASE_URL } from '../utils/api';

const TOKEN_KEY            = 'auth_token';
const USER_KEY             = 'auth_user';
const WISHLIST_IDS_KEY     = 'wishlist_ids';
const WISHLIST_BOOKS_KEY   = 'wishlist_books';
const WISHLIST_FOLDERS_KEY = 'wishlist_folders';
const LIBRARY_IDS_KEY      = 'library_ids';
const LIBRARY_BOOKS_KEY    = 'library_books';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [userSession,       setUserSession]       = useState(null);
  const [profile,           setProfile]           = useState(null);
  const [wishlistIds,       setWishlistIdsState]    = useState(new Set());
  const [wishlistBooks,     setWishlistBooksState]  = useState([]);
  const [wishlistFolders,   setWishlistFoldersState] = useState([]);
  const [libraryIds,        setLibraryIdsState]     = useState(new Set());
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

  const setWishlistFolders = useCallback((folders) => {
    setWishlistFoldersState(folders);
    AsyncStorage.setItem(WISHLIST_FOLDERS_KEY, JSON.stringify(folders));
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
      const [wishlistData, libraryData, foldersData] = await Promise.all([
        apiRequest('/wishlist', {}, token),
        apiRequest('/library',  {}, token),
        apiRequest('/wishlist/folders', {}, token),
      ]);
      setWishlistIds(new Set(wishlistData.map(b => b.id)));
      setWishlistBooks(wishlistData);
      setWishlistFolders(foldersData);
      setLibraryIds(new Set(libraryData.map(b => b.id)));
      setLibraryBooks(libraryData);
    } catch {}
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function bootstrap() {
      try {
        const [token, userRaw, idsRaw, booksRaw, foldersRaw, libIdsRaw, libBooksRaw] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
          AsyncStorage.getItem(WISHLIST_IDS_KEY),
          AsyncStorage.getItem(WISHLIST_BOOKS_KEY),
          AsyncStorage.getItem(WISHLIST_FOLDERS_KEY),
          AsyncStorage.getItem(LIBRARY_IDS_KEY),
          AsyncStorage.getItem(LIBRARY_BOOKS_KEY),
        ]);

        if (token && userRaw) {
          // Restore cached session immediately so app loads without waiting for network
          setUserSession(JSON.parse(userRaw));
          if (idsRaw)      setWishlistIdsState(new Set(JSON.parse(idsRaw)));
          if (booksRaw)    setWishlistBooksState(JSON.parse(booksRaw));
          if (foldersRaw)  setWishlistFoldersState(JSON.parse(foldersRaw));
          if (libIdsRaw)   setLibraryIdsState(new Set(JSON.parse(libIdsRaw)));
          if (libBooksRaw) setLibraryBooksState(JSON.parse(libBooksRaw));

          // Validate token with server in background (timeout handled by apiRequest)
          apiRequest('/auth/me', {}, token)
            .then(() => {
              syncAllFromServer(token);
            })
            .catch(async (e) => {
              // Only sign out on explicit server rejection (401), not network/timeout errors
              const msg = e?.message ?? '';
              if (msg.includes('autorizovan') || msg.includes('validan')) {
                setUserSession(null);
                await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
                await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
                await AsyncStorage.multiRemove([
                  WISHLIST_IDS_KEY, WISHLIST_BOOKS_KEY,
                  LIBRARY_IDS_KEY, LIBRARY_BOOKS_KEY,
                ]).catch(() => {});
              }
            });
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
      WISHLIST_IDS_KEY, WISHLIST_BOOKS_KEY, WISHLIST_FOLDERS_KEY,
      LIBRARY_IDS_KEY,  LIBRARY_BOOKS_KEY,
    ]);
    setUserSession(null);
    setProfile(null);
    setWishlistIdsState(new Set());
    setWishlistBooksState([]);
    setWishlistFoldersState([]);
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
      const rawAvatar = p.avatar_url ?? null;
      const resolvedAvatar = rawAvatar
        ? (rawAvatar.startsWith('http') ? rawAvatar : `${FILE_BASE_URL}${rawAvatar}`)
        : null;
      const updatedSession = {
        ...userSession,
        profile_public:  p.profile_public  ?? 1,
        library_public:  p.library_public  ?? 1,
        wishlist_public: p.wishlist_public ?? 1,
        avatar_url:      resolvedAvatar,
      };
      setUserSession(updatedSession);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedSession));
    } catch {}
  }

  async function uploadAvatar(localUri) {
    if (!userSession) return null;
    try {
      const token = await getToken();
      const fileServerBase = FILE_BASE_URL;
      const formData = new FormData();
      formData.append('avatar', {
        uri: localUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });
      const res = await fetch(`${BASE_URL}/auth/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.avatar_url) return null;
      const fullUrl = `${fileServerBase}${data.avatar_url}?t=${Date.now()}`;
      const updatedSession = { ...userSession, avatar_url: fullUrl };
      setUserSession(updatedSession);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedSession));
      return fullUrl;
    } catch {
      return null;
    }
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

  async function toggleWishlist(bookId, { title, author, coverUrl, minPrice, storeCount, folderId = null } = {}) {
    if (!userSession) return;
    const wasIn = wishlistIds.has(bookId);
    const prevIds = wishlistIds;
    const prevBooks = wishlistBooks;
    const newIds = new Set(wishlistIds);
    let newBooks = [...wishlistBooks];
    if (wasIn) {
      newIds.delete(bookId);
      newBooks = newBooks.filter(b => b.id !== bookId);
    } else {
      newIds.add(bookId);
      if (title && author) {
        newBooks = [{ id: bookId, title, author, cover_url: coverUrl, min_price: minPrice, store_count: storeCount, added_at: null, folder_id: folderId }, ...newBooks];
      }
    }
    setWishlistIds(newIds);
    setWishlistBooks(newBooks);
    try {
      const token = await getToken();
      if (wasIn) {
        await apiRequest(`/wishlist/${bookId}`, { method: 'DELETE' }, token);
      } else {
        await apiRequest(`/wishlist/${bookId}`, { method: 'POST', body: JSON.stringify({ folderId }) }, token);
      }
    } catch {
      setWishlistIds(prevIds);
      setWishlistBooks(prevBooks);
    }
  }

  async function syncWishlist() {
    if (!userSession) return;
    try {
      const token = await getToken();
      const [serverBooks, serverFolders] = await Promise.all([
        apiRequest('/wishlist', {}, token),
        apiRequest('/wishlist/folders', {}, token),
      ]);
      setWishlistIds(new Set(serverBooks.map(b => b.id)));
      setWishlistBooks(serverBooks);
      setWishlistFolders(serverFolders);
    } catch {}
  }

  async function createWishlistFolder(name) {
    if (!userSession) return null;
    try {
      const token = await getToken();
      const folder = await apiRequest('/wishlist/folders', { method: 'POST', body: JSON.stringify({ name }) }, token);
      setWishlistFoldersState(prev => {
        const updated = [...prev, folder];
        AsyncStorage.setItem(WISHLIST_FOLDERS_KEY, JSON.stringify(updated));
        return updated;
      });
      return folder;
    } catch { return null; }
  }

  async function renameWishlistFolder(id, name) {
    if (!userSession) return;
    setWishlistFoldersState(prev => {
      const updated = prev.map(f => f.id === id ? { ...f, name } : f);
      AsyncStorage.setItem(WISHLIST_FOLDERS_KEY, JSON.stringify(updated));
      return updated;
    });
    try {
      const token = await getToken();
      await apiRequest(`/wishlist/folders/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }, token);
    } catch { syncWishlist(); }
  }

  async function deleteWishlistFolder(id) {
    if (!userSession) return;
    setWishlistFoldersState(prev => {
      const updated = prev.filter(f => f.id !== id);
      AsyncStorage.setItem(WISHLIST_FOLDERS_KEY, JSON.stringify(updated));
      return updated;
    });
    setWishlistBooksState(prev => {
      const updated = prev.map(b => b.folder_id === id ? { ...b, folder_id: null } : b);
      AsyncStorage.setItem(WISHLIST_BOOKS_KEY, JSON.stringify(updated));
      return updated;
    });
    try {
      const token = await getToken();
      await apiRequest(`/wishlist/folders/${id}`, { method: 'DELETE' }, token);
    } catch { syncWishlist(); }
  }

  async function moveBookToFolder(bookId, folderId) {
    if (!userSession) return;
    setWishlistBooksState(prev => {
      const updated = prev.map(b => b.id === bookId ? { ...b, folder_id: folderId } : b);
      AsyncStorage.setItem(WISHLIST_BOOKS_KEY, JSON.stringify(updated));
      return updated;
    });
    try {
      const token = await getToken();
      await apiRequest(`/wishlist/${bookId}`, { method: 'PATCH', body: JSON.stringify({ folderId }) }, token);
    } catch { syncWishlist(); }
  }

  async function setBookPrivacy(bookId, isPrivate) {
    if (!userSession) return;
    setWishlistBooksState(prev => {
      const updated = prev.map(b => b.id === bookId ? { ...b, is_private: isPrivate ? 1 : 0 } : b);
      AsyncStorage.setItem(WISHLIST_BOOKS_KEY, JSON.stringify(updated));
      return updated;
    });
    try {
      const token = await getToken();
      await apiRequest(`/wishlist/${bookId}/privacy`, { method: 'PATCH', body: JSON.stringify({ isPrivate }) }, token);
    } catch { syncWishlist(); }
  }

  async function setFolderPrivacy(folderId, isPrivate) {
    if (!userSession) return;
    setWishlistFoldersState(prev => {
      const updated = prev.map(f => f.id === folderId ? { ...f, is_private: isPrivate ? 1 : 0 } : f);
      AsyncStorage.setItem(WISHLIST_FOLDERS_KEY, JSON.stringify(updated));
      return updated;
    });
    try {
      const token = await getToken();
      await apiRequest(`/wishlist/folders/${folderId}/privacy`, { method: 'PATCH', body: JSON.stringify({ isPrivate }) }, token);
    } catch { syncWishlist(); }
  }

  async function setLibraryBookPrivacy(bookId, isPrivate) {
    if (!userSession) return;
    setLibraryBooksState(prev => {
      const updated = prev.map(b => b.id === bookId ? { ...b, is_private: isPrivate ? 1 : 0 } : b);
      AsyncStorage.setItem(LIBRARY_BOOKS_KEY, JSON.stringify(updated));
      return updated;
    });
    try {
      const token = await getToken();
      await apiRequest(`/library/${bookId}/privacy`, { method: 'PATCH', body: JSON.stringify({ isPrivate }) }, token);
    } catch { syncLibrary(); }
  }

  async function updatePrivacySettings({ profilePublic, libraryPublic, wishlistPublic }) {
    if (!userSession) return;
    const patch = {};
    if (profilePublic  !== undefined) patch.profilePublic  = profilePublic;
    if (libraryPublic  !== undefined) patch.libraryPublic  = libraryPublic;
    if (wishlistPublic !== undefined) patch.wishlistPublic = wishlistPublic;

    // Optimistic update on session
    const updates = {};
    if (profilePublic  !== undefined) updates.profile_public  = profilePublic  ? 1 : 0;
    if (libraryPublic  !== undefined) updates.library_public  = libraryPublic  ? 1 : 0;
    if (wishlistPublic !== undefined) updates.wishlist_public = wishlistPublic ? 1 : 0;
    const updated = { ...userSession, ...updates };
    setUserSession(updated);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));

    try {
      const token = await getToken();
      await apiRequest('/auth/profile', { method: 'PATCH', body: JSON.stringify(patch) }, token);
    } catch { fetchMe(); }
  }

  // ── Library ───────────────────────────────────────────────────────────────────

  async function toggleLibrary(bookId, { title, author, coverUrl, minPrice } = {}) {
    if (!userSession) return;
    const wasIn = libraryIds.has(bookId);
    const prevIds = libraryIds;
    const prevBooks = libraryBooks;
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
    } catch {
      setLibraryIds(prevIds);
      setLibraryBooks(prevBooks);
    }
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

  if (!bootstrapped) return <SplashScreen />;

  return (
    <AuthContext.Provider value={{
      userSession, profile,
      wishlistIds, wishlistBooks, wishlistFolders,
      libraryIds, libraryBooks,
      isLoading, errorMessage, resetEmailSent,
      signIn, signUp, signOut, resetPassword,
      fetchMe, changePassword, updateDisplayName, uploadAvatar,
      toggleWishlist, syncWishlist,
      createWishlistFolder, renameWishlistFolder, deleteWishlistFolder, moveBookToFolder,
      setBookPrivacy, setFolderPrivacy, setLibraryBookPrivacy, updatePrivacySettings,
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
