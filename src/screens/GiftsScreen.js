import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../utils/api';
import { colors } from '../utils/colors';

// ── Helpers ───────────────────────────────────────────────────────────────────

function UserAvatar({ uri, name, size = 36 }) {
  const [failed, setFailed] = React.useState(false);
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
      <Text style={{ fontSize: size * 0.42, fontWeight: '700', color: colors.white }}>{initial}</Text>
    </LinearGradient>
  );
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'upravo';
  if (diffMin < 60) return `pre ${diffMin} min`;
  if (diffHr < 24) return `pre ${diffHr} ${diffHr === 1 ? 'sat' : diffHr < 5 ? 'sata' : 'sati'}`;
  if (diffDay === 1) return 'juče';
  if (diffDay < 7) return `pre ${diffDay} dana`;
  return d.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' });
}

function StatusChip({ status }) {
  const map = {
    pending:   { label: 'Na čekanju', bg: colors.gold + '28', color: '#A07800' },
    accepted:  { label: 'Prihvaćeno', bg: colors.mint + '28', color: colors.mint },
    declined:  { label: 'Odbijeno',   bg: colors.muted + '28', color: colors.muted },
    cancelled: { label: 'Otkazano',   bg: colors.muted + '28', color: colors.muted },
  };
  const { label, bg, color } = map[status] ?? map.pending;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Gift card ─────────────────────────────────────────────────────────────────

function GiftCard({ gift, isIncoming, onAccept, onDecline, onCancel, accepting, declining, cancelling }) {
  const { book, other_user, status, message, created_at } = gift;

  return (
    <View style={styles.card}>
      {/* Book cover + info */}
      <View style={styles.cardTop}>
        <View style={styles.coverWrap}>
          {book?.cover_url ? (
            <ExpoImage
              source={{ uri: book.cover_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="disk"
            />
          ) : (
            <Ionicons name="book" size={26} color={colors.muted} />
          )}
        </View>
        <View style={styles.bookMeta}>
          <Text style={styles.bookTitle} numberOfLines={2}>{book?.title ?? '—'}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{book?.author ?? ''}</Text>

          {/* Other user */}
          <View style={styles.userRow}>
            <UserAvatar uri={other_user?.avatar_url} name={other_user?.display_name} size={22} />
            <Text style={styles.userName} numberOfLines={1}>{other_user?.display_name ?? 'Korisnik'}</Text>
          </View>

          <View style={styles.metaBottom}>
            <StatusChip status={status} />
            <Text style={styles.timeText}>{relativeTime(created_at)}</Text>
          </View>
        </View>
      </View>

      {/* Message */}
      {!!message && (
        <View style={styles.messageBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.muted} />
          <Text style={styles.messageText} numberOfLines={3}>{message}</Text>
        </View>
      )}

      {/* Actions */}
      {isIncoming && status === 'pending' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={onAccept}
            disabled={accepting || declining}
            activeOpacity={0.82}
          >
            {accepting
              ? <ActivityIndicator size="small" color={colors.white} />
              : <>
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                  <Text style={styles.acceptBtnText}>Prihvati poklon</Text>
                </>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={onDecline}
            disabled={accepting || declining}
            activeOpacity={0.8}
          >
            {declining
              ? <ActivityIndicator size="small" color={colors.muted} />
              : <Ionicons name="close" size={20} color={colors.muted} />}
          </TouchableOpacity>
        </View>
      )}

      {isIncoming && status === 'accepted' && (
        <View style={styles.acceptedBadge}>
          <Ionicons name="checkmark-circle" size={15} color={colors.mint} />
          <Text style={styles.acceptedBadgeText}>Prihvaćeno ✓</Text>
        </View>
      )}

      {isIncoming && status === 'declined' && (
        <View style={styles.declinedBadge}>
          <Text style={styles.declinedBadgeText}>Odbijeno</Text>
        </View>
      )}

      {!isIncoming && status === 'pending' && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancel}
          disabled={cancelling}
          activeOpacity={0.8}
        >
          {cancelling
            ? <ActivityIndicator size="small" color={colors.muted} />
            : <>
                <Ionicons name="close-circle-outline" size={16} color={colors.muted} />
                <Text style={styles.cancelBtnText}>Otkaži</Text>
              </>}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function GiftsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('incoming');
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Per-item action loading states
  const [acceptingId, setAcceptingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchGifts = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;
      const res = await fetch(`${BASE_URL}/gifts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setIncoming(Array.isArray(data.incoming) ? data.incoming : []);
      setOutgoing(Array.isArray(data.outgoing) ? data.outgoing : []);
    } catch (e) {
      console.error('fetchGifts error:', e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchGifts().finally(() => setLoading(false));
  }, [fetchGifts]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchGifts();
    setRefreshing(false);
  }

  async function giftAction(id, action, setLoadingId) {
    setLoadingId(id);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/gifts/${id}/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Greška', err.message || 'Akcija nije uspela.');
        return;
      }
      await fetchGifts();
    } catch {
      Alert.alert('Greška', 'Proverite internet vezu.');
    } finally {
      setLoadingId(null);
    }
  }

  const list = tab === 'incoming' ? incoming : outgoing;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pokloni knjiga</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'incoming' && styles.tabBtnActive]}
          onPress={() => setTab('incoming')}
          activeOpacity={0.8}
        >
          <Ionicons name="gift" size={14} color={tab === 'incoming' ? colors.violet : colors.muted} />
          <Text style={[styles.tabBtnText, tab === 'incoming' && styles.tabBtnTextActive]}>Primljeno</Text>
          {incoming.filter(g => g.status === 'pending').length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{incoming.filter(g => g.status === 'pending').length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'outgoing' && styles.tabBtnActive]}
          onPress={() => setTab('outgoing')}
          activeOpacity={0.8}
        >
          <Ionicons name="paper-plane" size={14} color={tab === 'outgoing' ? colors.violet : colors.muted} />
          <Text style={[styles.tabBtnText, tab === 'outgoing' && styles.tabBtnTextActive]}>Poslato</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.violet} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="gift-outline" size={38} color={colors.violet + '80'} />
          </View>
          <Text style={styles.emptyTitle}>
            {tab === 'incoming' ? 'Nema primljenih poklona' : 'Nema poslatih poklona'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {tab === 'incoming'
              ? 'Kada prijatelj želi da ti pokloni knjigu, videćeš je ovde'
              : 'Idi na wishlist prijatelja i pokloni mu knjige'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.violet} />
          }
        >
          {list.map(gift => (
            <GiftCard
              key={gift.id}
              gift={gift}
              isIncoming={tab === 'incoming'}
              accepting={acceptingId === gift.id}
              declining={decliningId === gift.id}
              cancelling={cancellingId === gift.id}
              onAccept={() => giftAction(gift.id, 'accept', setAcceptingId)}
              onDecline={() => giftAction(gift.id, 'decline', setDecliningId)}
              onCancel={() =>
                Alert.alert('Otkaži poklon', 'Sigurno želiš da otkažeš ovaj poklon?', [
                  { text: 'Ne', style: 'cancel' },
                  { text: 'Otkaži', style: 'destructive', onPress: () => giftAction(gift.id, 'cancel', setCancellingId) },
                ])
              }
            />
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.textDark, textAlign: 'center' },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16, marginVertical: 12,
    backgroundColor: colors.white, borderRadius: 14, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabBtnActive: { backgroundColor: colors.violet + '14' },
  tabBtnText: { fontSize: 14, fontWeight: '500', color: colors.muted },
  tabBtnTextActive: { fontSize: 14, fontWeight: '700', color: colors.violet },
  badge: {
    backgroundColor: colors.violet, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.white },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingBottom: 60 },
  emptyIconBg: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.violet + '14',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.textDark },
  emptySubtitle: { fontSize: 13, color: colors.muted, textAlign: 'center', paddingHorizontal: 36 },

  listContent: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  card: {
    backgroundColor: colors.white, borderRadius: 16,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10,
  },
  cardTop: { flexDirection: 'row', gap: 14 },
  coverWrap: {
    width: 68, height: 96, borderRadius: 10,
    backgroundColor: '#EEEEf8', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  bookMeta: { flex: 1, gap: 5 },
  bookTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, lineHeight: 20 },
  bookAuthor: { fontSize: 12, color: colors.muted2 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  userName: { fontSize: 12, fontWeight: '600', color: colors.textDark, flex: 1 },
  metaBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  timeText: { fontSize: 11, color: colors.muted },

  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 11, fontWeight: '700' },

  messageBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder,
  },
  messageText: { fontSize: 13, color: '#4A4A6A', lineHeight: 18, flex: 1 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.mint, borderRadius: 12, paddingVertical: 13,
  },
  acceptBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  declineBtn: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: '#F0EFF8', justifyContent: 'center', alignItems: 'center',
  },

  acceptedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.mint + '18',
  },
  acceptedBadgeText: { fontSize: 13, fontWeight: '700', color: colors.mint },
  declinedBadge: {
    alignItems: 'center', justifyContent: 'center',
    marginTop: 12, paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.muted + '18',
  },
  declinedBadgeText: { fontSize: 13, fontWeight: '600', color: colors.muted },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#F5F5FA',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: colors.muted },
});
