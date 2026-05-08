import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, BASE_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

export function UserProfileScreen({ route, navigation }) {
  const { userId, displayName } = route.params;
  const { userSession } = useAuth();
  const insets = useSafeAreaInsets();

  const [profile,      setProfile]      = useState(null);
  const [wishlist,     setWishlist]     = useState(null);
  const [library,      setLibrary]      = useState(null);
  const [tab,          setTab]          = useState('wishlist');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [openFolder,   setOpenFolder]   = useState(null);
  const [friendStatus, setFriendStatus] = useState('none'); // 'none'|'pending_sent'|'pending_received'|'friends'|'self'
  const [friendLoading, setFriendLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = userSession ? await SecureStore.getItemAsync('auth_token') : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const requests = [
        fetch(`${BASE_URL}/users/${userId}`, { headers }).then(r => r.json()),
        fetch(`${BASE_URL}/users/${userId}/wishlist`, { headers }).then(r => r.json()),
        fetch(`${BASE_URL}/users/${userId}/library`,  { headers }).then(r => r.json()),
      ];
      if (token) {
        requests.push(
          fetch(`${BASE_URL}/friends/status/${userId}`, { headers }).then(r => r.json())
        );
      }

      const results = await Promise.all(requests);
      const [prof, wl, lib, statusData] = results;

      if (prof.message) { setError(prof.message); return; }
      setProfile(prof);
      setWishlist(wl.message ? null : wl);
      setLibrary(lib.message ? null : lib);
      if (statusData) setFriendStatus(statusData.status ?? 'none');
    } catch {
      setError('Greška pri učitavanju profila.');
    } finally {
      setLoading(false);
    }
  }, [userId, userSession]);

  async function sendFriendRequest() {
    setFriendLoading(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/friends/request-by-id/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFriendStatus(data.status === 'accepted' ? 'friends' : 'pending_sent');
      } else {
        Alert.alert('Greška', data.message || 'Nije uspelo slanje zahteva.');
      }
    } catch {
      Alert.alert('Greška', 'Proverite internet vezu.');
    } finally {
      setFriendLoading(false);
    }
  }

  async function removeFriend() {
    Alert.alert('Ukloni prijatelja', 'Ukloniti ovog korisnika iz prijatelja?', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Ukloni', style: 'destructive',
        onPress: async () => {
          setFriendLoading(true);
          try {
            const token = await SecureStore.getItemAsync('auth_token');
            await fetch(`${BASE_URL}/friends/${userId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            setFriendStatus('none');
          } catch {}
          setFriendLoading(false);
        },
      },
    ]);
  }

  useEffect(() => { load(); }, [load]);

  const initial = (displayName || profile?.display_name || '?')[0].toUpperCase();

  const memberSince = (() => {
    const raw = profile?.created_at;
    if (!raw) return '';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('sr-RS', { year: 'numeric', month: 'long' });
  })();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayName || profile?.display_name || ''}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.violet} /></View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={40} color={colors.muted} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Avatar card */}
          <View style={styles.avatarCard}>
            {profile.avatar_url ? (
              <ExpoImage
                source={{ uri: profile.avatar_url.startsWith('http') ? profile.avatar_url : `${BASE_URL.replace('/api', '')}${profile.avatar_url}` }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <LinearGradient colors={[colors.violet, colors.sky]} style={styles.avatar}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </LinearGradient>
            )}
            <Text style={styles.name}>{profile.display_name}</Text>
            {memberSince ? <Text style={styles.since}>Član od {memberSince}</Text> : null}

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{profile.wishlist_count ?? 0}</Text>
                <Text style={styles.statLabel}>Wishlist</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{profile.library_count ?? 0}</Text>
                <Text style={styles.statLabel}>Pročitano</Text>
              </View>
            </View>

            {userSession && friendStatus !== 'self' && (
              <View style={{ marginTop: 18, width: '100%', paddingHorizontal: 20 }}>
                {friendStatus === 'friends' ? (
                  <TouchableOpacity style={styles.friendBtnFriends} onPress={removeFriend} disabled={friendLoading} activeOpacity={0.8}>
                    {friendLoading
                      ? <ActivityIndicator size="small" color={colors.mint} />
                      : <>
                          <Ionicons name="people" size={16} color={colors.mint} />
                          <Text style={styles.friendBtnFriendsText}>Prijatelji</Text>
                        </>}
                  </TouchableOpacity>
                ) : friendStatus === 'pending_sent' ? (
                  <View style={styles.friendBtnPending}>
                    <Ionicons name="time-outline" size={16} color={colors.muted} />
                    <Text style={styles.friendBtnPendingText}>Zahtev poslat</Text>
                  </View>
                ) : friendStatus === 'pending_received' ? (
                  <TouchableOpacity style={styles.friendBtnAdd} onPress={sendFriendRequest} disabled={friendLoading} activeOpacity={0.85}>
                    {friendLoading
                      ? <ActivityIndicator size="small" color={colors.white} />
                      : <>
                          <Ionicons name="checkmark" size={16} color={colors.white} />
                          <Text style={styles.friendBtnAddText}>Prihvati zahtev</Text>
                        </>}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.friendBtnAdd} onPress={sendFriendRequest} disabled={friendLoading} activeOpacity={0.85}>
                    {friendLoading
                      ? <ActivityIndicator size="small" color={colors.white} />
                      : <>
                          <Ionicons name="person-add" size={16} color={colors.white} />
                          <Text style={styles.friendBtnAddText}>Dodaj prijatelja</Text>
                        </>}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Tab switch */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'wishlist' && styles.tabActive]}
              onPress={() => { setTab('wishlist'); setOpenFolder(null); }}
            >
              <Ionicons name="heart" size={14} color={tab === 'wishlist' ? colors.violet : colors.muted} />
              <Text style={[styles.tabText, tab === 'wishlist' && styles.tabTextActive]}>Wishlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'library' && styles.tabActive]}
              onPress={() => setTab('library')}
            >
              <Ionicons name="library" size={14} color={tab === 'library' ? colors.violet : colors.muted} />
              <Text style={[styles.tabText, tab === 'library' && styles.tabTextActive]}>Biblioteka</Text>
            </TouchableOpacity>
          </View>

          {/* Wishlist tab */}
          {tab === 'wishlist' && (
            wishlist === null ? (
              <PrivateSection label="Wishlist je privatan" />
            ) : openFolder ? (
              <FolderDetail
                folder={openFolder}
                books={wishlist.books.filter(b => b.folder_id === openFolder.id)}
                onBack={() => setOpenFolder(null)}
                onBookPress={id => navigation.navigate('BookDetail', { bookId: id })}
              />
            ) : (
              <WishlistView
                folders={wishlist.folders}
                books={wishlist.books}
                onFolderPress={setOpenFolder}
                onBookPress={id => navigation.navigate('BookDetail', { bookId: id })}
              />
            )
          )}

          {/* Library tab */}
          {tab === 'library' && (
            library === null ? (
              <PrivateSection label="Biblioteka je privatna" />
            ) : library.length === 0 ? (
              <EmptySection label="Biblioteka je prazna" icon="library" />
            ) : (
              <View style={styles.listWrap}>
                {library.map(item => (
                  <BookRow
                    key={item.id}
                    item={item}
                    onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
                    badge={<View style={styles.readBadge}><Ionicons name="checkmark-circle" size={11} color={colors.mint} /><Text style={styles.readBadgeText}>Pročitano</Text></View>}
                  />
                ))}
              </View>
            )
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WishlistView({ folders, books, onFolderPress, onBookPress }) {
  const uncategorized = books.filter(b => !b.folder_id);
  if (folders.length === 0 && books.length === 0)
    return <EmptySection label="Wishlist je prazan" icon="heart-outline" />;

  return (
    <View style={styles.listWrap}>
      {folders.map(f => {
        const count = books.filter(b => b.folder_id === f.id).length;
        return (
          <TouchableOpacity key={f.id} style={styles.folderCard} onPress={() => onFolderPress(f)} activeOpacity={0.82}>
            <View style={styles.folderIcon}>
              <Ionicons name="folder" size={22} color={colors.violet} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.folderName}>{f.name}</Text>
              <Text style={styles.folderSub}>{count === 0 ? 'Prazan' : `${count} ${count === 1 ? 'knjiga' : count < 5 ? 'knjige' : 'knjiga'}`}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#C0C0D8" />
          </TouchableOpacity>
        );
      })}
      {uncategorized.map(item => (
        <BookRow key={item.id} item={item} onPress={() => onBookPress(item.id)} />
      ))}
    </View>
  );
}

function FolderDetail({ folder, books, onBack, onBookPress }) {
  return (
    <View>
      <TouchableOpacity style={styles.folderBackRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={16} color={colors.violet} />
        <Text style={styles.folderBackText}>{folder.name}</Text>
      </TouchableOpacity>
      {books.length === 0
        ? <EmptySection label="Folder je prazan" icon="folder-open-outline" />
        : <View style={styles.listWrap}>{books.map(item => <BookRow key={item.id} item={item} onPress={() => onBookPress(item.id)} />)}</View>
      }
    </View>
  );
}

function BookRow({ item, onPress, badge }) {
  return (
    <TouchableOpacity style={styles.bookRow} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.bookCover}>
        {item.cover_url ? (
          <ExpoImage source={{ uri: item.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
        ) : (
          <Ionicons name="book" size={22} color={colors.muted} />
        )}
      </View>
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
        {item.min_price != null && <Text style={styles.bookPrice}>{item.min_price} RSD</Text>}
        {badge}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#C0C0D8" />
    </TouchableOpacity>
  );
}

function PrivateSection({ label }) {
  return (
    <View style={styles.centered}>
      <Ionicons name="lock-closed" size={36} color={colors.muted} />
      <Text style={styles.emptyTitle}>{label}</Text>
    </View>
  );
}

function EmptySection({ label, icon }) {
  return (
    <View style={styles.centered}>
      <Ionicons name={icon} size={36} color={colors.muted} />
      <Text style={styles.emptyTitle}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.background },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 60 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10 },
  backBtn:    { padding: 8 },
  headerTitle:{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.textDark, textAlign: 'center' },

  avatarCard: { alignItems: 'center', backgroundColor: colors.white, marginHorizontal: 16, marginBottom: 16, borderRadius: 20, paddingVertical: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8 },
  avatar:     { width: 76, height: 76, borderRadius: 38, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarInitial: { fontSize: 30, fontWeight: '700', color: colors.white },
  name:       { fontSize: 20, fontWeight: '700', color: colors.textDark },
  since:      { fontSize: 13, color: colors.muted, marginTop: 3 },

  statsRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 0 },
  statBox:     { alignItems: 'center', paddingHorizontal: 32 },
  statNum:     { fontSize: 22, fontWeight: '700', color: colors.violet },
  statLabel:   { fontSize: 12, color: colors.muted, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: colors.cardBorder },

  tabs:        { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.white, borderRadius: 14, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  tab:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive:   { backgroundColor: colors.violet + '14' },
  tabText:     { fontSize: 14, fontWeight: '500', color: colors.muted },
  tabTextActive:{ fontSize: 14, fontWeight: '700', color: colors.violet },

  listWrap:    { paddingHorizontal: 16, gap: 10 },

  folderCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.white, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  folderIcon:  { width: 42, height: 42, borderRadius: 11, backgroundColor: colors.violet + '14', justifyContent: 'center', alignItems: 'center' },
  folderName:  { fontSize: 15, fontWeight: '600', color: colors.textDark },
  folderSub:   { fontSize: 12, color: colors.muted, marginTop: 2 },

  folderBackRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 12 },
  folderBackText:{ fontSize: 15, fontWeight: '600', color: colors.violet },

  bookRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: colors.white, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  bookCover:   { width: 56, height: 78, borderRadius: 8, backgroundColor: '#EEEEf8', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  bookInfo:    { flex: 1, gap: 4 },
  bookTitle:   { fontSize: 14, fontWeight: '600', color: colors.textDark },
  bookAuthor:  { fontSize: 12, color: colors.muted2 },
  bookPrice:   { fontSize: 13, fontWeight: '700', color: colors.violet },

  readBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  readBadgeText: { fontSize: 11, fontWeight: '600', color: colors.mint },

  emptyTitle:  { fontSize: 16, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  errorText:   { fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },

  friendBtnAdd: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.violet, borderRadius: 14, paddingVertical: 12,
  },
  friendBtnAddText: { fontSize: 15, fontWeight: '700', color: colors.white },
  friendBtnFriends: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.mint + '18', borderRadius: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: colors.mint + '40',
  },
  friendBtnFriendsText: { fontSize: 15, fontWeight: '700', color: colors.mint },
  friendBtnPending: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F0EFF8', borderRadius: 14, paddingVertical: 12,
  },
  friendBtnPendingText: { fontSize: 15, fontWeight: '600', color: colors.muted },
});
