import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, TextInput,
  StyleSheet, Modal, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function UserAvatar({ uri, name, size = 32 }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?')[0].toUpperCase();
  if (uri && !failed) {
    return (
      <ExpoImage
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        cachePolicy="memory-disk"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <LinearGradient
      colors={[colors.violet, colors.sky]}
      style={{ width: size, height: size, borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}
    >
      <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: colors.white }}>{initial}</Text>
    </LinearGradient>
  );
}

function TrustBadge({ score }) {
  if (score == null) {
    return (
      <View style={styles.trustBadge}>
        <Ionicons name="star-outline" size={11} color={colors.muted} />
        <Text style={[styles.trustText, { color: colors.muted }]}>Nema ocena</Text>
      </View>
    );
  }
  return (
    <View style={[styles.trustBadge, { backgroundColor: colors.gold + '22' }]}>
      <Ionicons name="star" size={11} color={colors.gold} />
      <Text style={[styles.trustText, { color: '#A07000' }]}>{parseFloat(score).toFixed(1)}</Text>
    </View>
  );
}

function StatusBadge({ status }) {
  const config = {
    dostupno:  { label: 'Dostupno',  bg: colors.mint + '22',  text: colors.mint },
    pauzirano: { label: 'Pauzirano', bg: colors.muted + '22', text: colors.muted },
    active:    { label: 'Dostupno',  bg: colors.mint + '22',  text: colors.mint },
    paused:    { label: 'Pauzirano', bg: colors.muted + '22', text: colors.muted },
  };
  const cfg = config[status] ?? { label: status, bg: colors.muted + '22', text: colors.muted };
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ── Exchange card (browse) ────────────────────────────────────────────────────

function ExchangeCard({ item, onRequestPress, onOwnerPress }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.coverWrap}>
          {item.book?.cover_url ? (
            <ExpoImage
              source={{ uri: item.book.cover_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="disk"
            />
          ) : (
            <Ionicons name="book" size={26} color={colors.muted} />
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.book?.title ?? '–'}</Text>
          <Text style={styles.cardAuthor} numberOfLines={1}>{item.book?.author ?? ''}</Text>
          {item.notes ? (
            <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>
          ) : null}
          <TouchableOpacity style={styles.ownerRow} onPress={onOwnerPress} activeOpacity={0.75}>
            <UserAvatar uri={item.owner?.avatar_url} name={item.owner?.display_name} size={22} />
            <Text style={styles.ownerName} numberOfLines={1}>{item.owner?.display_name ?? 'Korisnik'}</Text>
            <TrustBadge score={item.owner?.avg_trust_score} />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.requestBtn} onPress={onRequestPress} activeOpacity={0.85}>
        <Ionicons name="swap-horizontal" size={15} color={colors.white} />
        <Text style={styles.requestBtnText}>Zatraži zamenu</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── My listing card ───────────────────────────────────────────────────────────

function MyListingCard({ item, onDelete, onToggle }) {
  const isActive = item.status === 'active' || item.status === 'dostupno';
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.coverWrap}>
          {item.book?.cover_url ? (
            <ExpoImage
              source={{ uri: item.book.cover_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="disk"
            />
          ) : (
            <Ionicons name="book" size={26} color={colors.muted} />
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.book?.title ?? '–'}</Text>
          <Text style={styles.cardAuthor} numberOfLines={1}>{item.book?.author ?? ''}</Text>
          <StatusBadge status={item.status} />
          {item.notes ? (
            <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.myCardActions}>
        <TouchableOpacity style={styles.toggleBtn} onPress={onToggle} activeOpacity={0.8}>
          <Ionicons
            name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            size={15}
            color={colors.violet}
          />
          <Text style={styles.toggleBtnText}>{isActive ? 'Pauziraj' : 'Aktiviraj'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={15} color={colors.error} />
          <Text style={styles.deleteBtnText}>Ukloni</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Request modal ─────────────────────────────────────────────────────────────

function RequestModal({ visible, listing, onClose }) {
  const [message, setMessage]       = useState('');
  const [wishlist, setWishlist]     = useState([]);
  const [selectedBook, setSelected] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [sending, setSending]       = useState(false);

  useEffect(() => {
    if (!visible) return;
    setMessage('');
    setSelected(null);
    loadWishlist();
  }, [visible]);

  async function loadWishlist() {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWishlist(Array.isArray(data?.books) ? data.books : Array.isArray(data) ? data : []);
    } catch {
      setWishlist([]);
    }
    setLoading(false);
  }

  async function handleSend() {
    setSending(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const body = { wantedListingId: listing?.id, message };
      if (selectedBook) body.offeredBookId = selectedBook.id;
      const res = await fetch(`${BASE_URL}/exchange/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Greška', data.message ?? 'Nije uspelo slanje zahteva.');
      } else {
        Alert.alert('Uspešno', 'Zahtev za zamenu je poslat!');
        onClose();
      }
    } catch {
      Alert.alert('Greška', 'Proverite internet vezu.');
    }
    setSending(false);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>Odustani</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Zatraži zamenu</Text>
            <View style={{ width: 70 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {listing?.book ? (
              <View style={styles.modalBookRow}>
                <View style={styles.modalCover}>
                  {listing.book.cover_url ? (
                    <ExpoImage source={{ uri: listing.book.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
                  ) : (
                    <Ionicons name="book" size={18} color={colors.muted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalBookTitle} numberOfLines={2}>{listing.book.title}</Text>
                  <Text style={styles.modalBookAuthor} numberOfLines={1}>{listing.book.author}</Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Poruka (opciono)</Text>
            <TextInput
              style={styles.textArea}
              value={message}
              onChangeText={setMessage}
              placeholder="Napišite poruku vlasniku..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <Text style={styles.inputLabel}>Ponudite knjigu iz vaše liste (opciono)</Text>
            {loading ? (
              <ActivityIndicator color={colors.violet} style={{ marginTop: 8 }} />
            ) : wishlist.length === 0 ? (
              <Text style={styles.emptySubtitle}>Nema knjiga u wishlistu</Text>
            ) : (
              <View style={styles.offerList}>
                {wishlist.map(book => (
                  <TouchableOpacity
                    key={book.id}
                    style={[styles.offerRow, selectedBook?.id === book.id && styles.offerRowSelected]}
                    onPress={() => setSelected(selectedBook?.id === book.id ? null : book)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.offerCover}>
                      {book.cover_url ? (
                        <ExpoImage source={{ uri: book.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
                      ) : (
                        <Ionicons name="book" size={14} color={colors.muted} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.offerTitle} numberOfLines={1}>{book.title}</Text>
                      <Text style={styles.offerAuthor} numberOfLines={1}>{book.author}</Text>
                    </View>
                    {selectedBook?.id === book.id && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.violet} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending} activeOpacity={0.85}>
              {sending
                ? <ActivityIndicator color={colors.white} />
                : <>
                    <Ionicons name="send" size={16} color={colors.white} />
                    <Text style={styles.sendBtnText}>Pošalji zahtev</Text>
                  </>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Add listing modal ─────────────────────────────────────────────────────────

function AddListingModal({ visible, onClose, onAdded }) {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setNotes('');
    loadWishlist();
  }, [visible]);

  async function loadWishlist() {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWishlist(Array.isArray(data?.books) ? data.books : Array.isArray(data) ? data : []);
    } catch {
      setWishlist([]);
    }
    setLoading(false);
  }

  async function handleAdd() {
    if (!selected) return;
    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/exchange`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: selected.id, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Greška', data.message ?? 'Nije uspelo dodavanje.');
      } else {
        onAdded?.();
        onClose();
      }
    } catch {
      Alert.alert('Greška', 'Proverite internet vezu.');
    }
    setSaving(false);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>Odustani</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Dodaj knjigu</Text>
            <View style={{ width: 70 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Izaberi knjigu iz wishlist-a</Text>
            {loading ? (
              <ActivityIndicator color={colors.violet} style={{ marginTop: 12 }} />
            ) : wishlist.length === 0 ? (
              <View style={styles.emptyInModal}>
                <Ionicons name="heart-outline" size={36} color={colors.muted} />
                <Text style={styles.emptyTitle}>Wishlist je prazan</Text>
                <Text style={styles.emptySubtitle}>Dodaj knjige u wishlist da bi ih mogao ponuditi za zamenu</Text>
              </View>
            ) : (
              <View style={styles.offerList}>
                {wishlist.map(book => (
                  <TouchableOpacity
                    key={book.id}
                    style={[styles.offerRow, selected?.id === book.id && styles.offerRowSelected]}
                    onPress={() => setSelected(selected?.id === book.id ? null : book)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.offerCover}>
                      {book.cover_url ? (
                        <ExpoImage source={{ uri: book.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
                      ) : (
                        <Ionicons name="book" size={14} color={colors.muted} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.offerTitle} numberOfLines={1}>{book.title}</Text>
                      <Text style={styles.offerAuthor} numberOfLines={1}>{book.author}</Text>
                    </View>
                    {selected?.id === book.id && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.violet} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selected ? (
              <>
                <Text style={[styles.inputLabel, { marginTop: 18 }]}>Napomena (opciono)</Text>
                <TextInput
                  style={styles.textArea}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Stanje knjige, lokacija za razmenu..."
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={3}
                  maxLength={400}
                />
              </>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.sendBtn, !selected && { opacity: 0.5 }]}
              onPress={handleAdd}
              disabled={!selected || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color={colors.white} />
                : <>
                    <Ionicons name="add" size={16} color={colors.white} />
                    <Text style={styles.sendBtnText}>Dodaj oglas</Text>
                  </>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Browse tab ────────────────────────────────────────────────────────────────

function BrowseTab({ navigation }) {
  const [query, setQuery]           = useState('');
  const [listings, setListings]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [requestTarget, setRequestTarget] = useState(null);

  const debouncedQ = useDebounce(query, 380);

  const fetchListings = useCallback(async (q, p, replace) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set('q', q);
      const res = await fetch(`${BASE_URL}/exchange?${params.toString()}`);
      const data = await res.json();
      const raw   = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      const items = raw.map(r => ({
        id: r.id, notes: r.notes, status: r.status, created_at: r.created_at,
        book:  { id: r.book_id,  title: r.title,        author: r.author,        cover_url: r.cover_url  },
        owner: { id: r.owner_id, display_name: r.display_name, avatar_url: r.avatar_url, avg_trust_score: r.trust_score },
      }));
      const total = data?.total ?? items.length;
      if (replace) {
        setListings(items);
      } else {
        setListings(prev => [...prev, ...items]);
      }
      setHasMore(items.length > 0 && (replace ? items.length : listings.length + items.length) < total);
      setPage(p);
    } catch {
      if (replace) setListings([]);
    }
    if (replace) setLoading(false);
    else setLoadingMore(false);
  }, [listings.length]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchListings(debouncedQ, 1, true);
  }, [debouncedQ]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchListings(debouncedQ, 1, true);
    setRefreshing(false);
  }

  function onEndReached() {
    if (!hasMore || loadingMore || loading) return;
    fetchListings(debouncedQ, page + 1, false);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={17} color={colors.muted} style={{ marginLeft: 12 }} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Pretraži oglase za zamenu..."
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.violet} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="swap-horizontal" size={32} color={colors.violet + '80'} />
          </View>
          <Text style={styles.emptyTitle}>Nema oglasa</Text>
          <Text style={styles.emptySubtitle}>
            {query ? 'Pokušaj drugačiji upit' : 'Budi prvi koji dodaje oglas za zamenu'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listWrap}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.violet} style={{ marginVertical: 16 }} /> : null}
          renderItem={({ item }) => (
            <ExchangeCard
              item={item}
              onRequestPress={() => setRequestTarget(item)}
              onOwnerPress={() => navigation.navigate('UserProfile', { userId: item.owner?.id, displayName: item.owner?.display_name })}
            />
          )}
        />
      )}

      <RequestModal
        visible={!!requestTarget}
        listing={requestTarget}
        onClose={() => setRequestTarget(null)}
      />
    </View>
  );
}

// ── My listings tab ───────────────────────────────────────────────────────────

function MyTab() {
  const { userSession } = useAuth();
  const [listings, setListings]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd]     = useState(false);

  const loadMyListings = useCallback(async () => {
    if (!userSession) return;
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/exchange/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = await res.json();
      const data = (Array.isArray(raw) ? raw : []).map(r => ({
        id: r.id, notes: r.notes, status: r.status,
        book: { id: r.book_id, title: r.title, author: r.author, cover_url: r.cover_url },
      }));
      setListings(data);
    } catch {
      setListings([]);
    }
    setLoading(false);
  }, [userSession]);

  useEffect(() => { loadMyListings(); }, [loadMyListings]);

  async function onRefresh() {
    setRefreshing(true);
    await loadMyListings();
    setRefreshing(false);
  }

  async function handleDelete(id) {
    Alert.alert('Ukloni oglas', 'Da li sigurno želiš da ukloniš ovaj oglas?', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Ukloni', style: 'destructive',
        onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync('auth_token');
            const res = await fetch(`${BASE_URL}/exchange/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              setListings(prev => prev.filter(l => l.id !== id));
            } else {
              Alert.alert('Greška', 'Nije uspelo brisanje oglasa.');
            }
          } catch {
            Alert.alert('Greška', 'Proverite internet vezu.');
          }
        },
      },
    ]);
  }

  async function handleToggle(item) {
    const isActive = item.status === 'active' || item.status === 'dostupno';
    const newStatus = isActive ? 'paused' : 'active';
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/exchange/${item.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setListings(prev => prev.map(l => l.id === item.id ? { ...l, status: newStatus } : l));
      }
    } catch {
      Alert.alert('Greška', 'Nije uspelo ažuriranje statusa.');
    }
  }

  if (!userSession) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-outline" size={44} color={colors.muted} />
        <Text style={styles.emptyTitle}>Nisi prijavljen</Text>
        <Text style={styles.emptySubtitle}>Prijavi se da bi upravljao oglasima</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.violet} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={listings}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[styles.listWrap, listings.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="swap-horizontal-outline" size={32} color={colors.violet + '80'} />
            </View>
            <Text style={styles.emptyTitle}>Nema tvojih oglasa</Text>
            <Text style={styles.emptySubtitle}>Dodaj knjige iz svog wishlist-a{'\n'}i ponudi ih drugima za zamenu</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MyListingCard
            item={item}
            onDelete={() => handleDelete(item.id)}
            onToggle={() => handleToggle(item)}
          />
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={26} color={colors.white} />
      </TouchableOpacity>

      <AddListingModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={loadMyListings}
      />
    </View>
  );
}

// ── Main ExchangeScreen ───────────────────────────────────────────────────────

export function ExchangeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('browse');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Razmena knjiga</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate('ExchangeRequests')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="mail-outline" size={22} color={colors.textDark} />
        </TouchableOpacity>
      </View>

      {/* Tab switch */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'browse' && styles.tabBtnActive]}
          onPress={() => setTab('browse')}
        >
          <Ionicons name="search" size={14} color={tab === 'browse' ? colors.violet : colors.muted} />
          <Text style={[styles.tabBtnText, tab === 'browse' && styles.tabBtnTextActive]}>Pretraži</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'my' && styles.tabBtnActive]}
          onPress={() => setTab('my')}
        >
          <Ionicons name="person" size={14} color={tab === 'my' ? colors.violet : colors.muted} />
          <Text style={[styles.tabBtnText, tab === 'my' && styles.tabBtnTextActive]}>Moje</Text>
        </TouchableOpacity>
      </View>

      {tab === 'browse' ? <BrowseTab navigation={navigation} /> : <MyTab />}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  headerBtn: { padding: 8 },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.white, borderRadius: 14, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: colors.violet + '14' },
  tabBtnText: { fontSize: 14, fontWeight: '500', color: colors.muted },
  tabBtnTextActive: { fontSize: 14, fontWeight: '700', color: colors.violet },

  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
  },
  searchInput: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 12,
    fontSize: 15, color: colors.textDark,
  },

  listWrap: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingBottom: 60 },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.violet + '14',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.textDark },
  emptySubtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },

  card: {
    backgroundColor: colors.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', gap: 14, padding: 14 },
  coverWrap: {
    width: 72, height: 100, borderRadius: 10,
    backgroundColor: '#EEEEf8', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  cardInfo: { flex: 1, gap: 5 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.textDark },
  cardAuthor: { fontSize: 12, color: colors.muted2 },
  cardNotes: { fontSize: 13, color: '#4A4A6A', lineHeight: 18 },

  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  ownerName: { fontSize: 13, fontWeight: '500', color: colors.textDark, flex: 1 },

  trustBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.muted + '18',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  trustText: { fontSize: 11, fontWeight: '600' },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  requestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: colors.violet,
    marginHorizontal: 14, marginBottom: 14, paddingVertical: 11, borderRadius: 12,
  },
  requestBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },

  myCardActions: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 14, marginBottom: 14,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.violet + '14',
    borderWidth: 1, borderColor: colors.violet + '30',
  },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: colors.violet },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.error + '10',
    borderWidth: 1, borderColor: colors.error + '30',
  },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: colors.error },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.violet,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.violet, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 8,
  },

  // Modal
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark },
  modalCancel: { fontSize: 15, color: colors.muted2 },
  modalBody: { padding: 20, paddingBottom: 32, gap: 4 },
  modalFooter: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder,
    backgroundColor: colors.white,
  },

  modalBookRow: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 14, padding: 12, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
  },
  modalCover: {
    width: 44, height: 62, borderRadius: 8,
    backgroundColor: '#EEEEf8', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBookTitle: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  modalBookAuthor: { fontSize: 12, color: colors.muted2, marginTop: 2 },

  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8, marginTop: 4 },
  textArea: {
    backgroundColor: colors.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.cardBorder,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.textDark, minHeight: 88,
    textAlignVertical: 'top',
  },

  offerList: { gap: 8, marginTop: 4 },
  offerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderRadius: 12, padding: 10,
    borderWidth: 1.5, borderColor: colors.cardBorder,
  },
  offerRowSelected: { borderColor: colors.violet, backgroundColor: colors.violet + '08' },
  offerCover: {
    width: 36, height: 50, borderRadius: 6,
    backgroundColor: '#EEEEf8', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  offerTitle:  { fontSize: 13, fontWeight: '600', color: colors.textDark },
  offerAuthor: { fontSize: 11, color: colors.muted2, marginTop: 1 },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.violet, borderRadius: 16, paddingVertical: 16,
  },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },

  emptyInModal: { alignItems: 'center', gap: 10, paddingVertical: 24 },
});
