import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../utils/api';
import { colors } from '../utils/colors';

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
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

const TYPE_CONFIG = {
  gift_offer: {
    icon: 'gift',
    color: colors.violet,
    bg: colors.violet + '22',
    title: null,
    getText: (data) =>
      `${data.from_user_name ?? 'Neko'} želi da ti pokloni: ${data.book_title ?? 'knjigu'}`,
  },
  gift_accepted: {
    icon: 'checkmark-circle',
    color: colors.mint,
    bg: colors.mint + '22',
    title: null,
    getText: (data) =>
      `${data.to_user_name ?? 'Neko'} je prihvatio/la tvoj poklon: ${data.book_title ?? 'knjiga'}`,
  },
  gift_declined: {
    icon: 'close-circle',
    color: colors.muted,
    bg: colors.muted + '22',
    title: null,
    getText: (data) =>
      `${data.to_user_name ?? 'Neko'} je odbio/la tvoj poklon: ${data.book_title ?? 'knjiga'}`,
  },
  exchange_accepted: {
    icon: 'checkmark-circle',
    color: colors.mint,
    bg: colors.mint + '22',
    title: null,
    getText: (data) =>
      `${data.other_name ?? 'Neko'} je prihvatio/la tvoj zahtev za razmenu: ${data.book_title ?? 'knjiga'}`,
  },
  exchange_declined: {
    icon: 'close-circle',
    color: colors.muted,
    bg: colors.muted + '22',
    title: null,
    getText: (data) =>
      `${data.other_name ?? 'Neko'} je odbio/la tvoj zahtev za razmenu: ${data.book_title ?? 'knjiga'}`,
  },
  exchange_completed: {
    icon: 'swap-horizontal',
    color: colors.violet,
    bg: colors.violet + '22',
    title: 'Razmena završena!',
    getText: (data) =>
      `Razmena sa ${data.other_name ?? 'korisnik'} za knjugu "${data.book_title ?? 'knjiga'}" je završena`,
  },
  exchange_cancelled: {
    icon: 'ban',
    color: '#E53935',
    bg: '#E5393522',
    title: null,
    getText: (data) =>
      `${data.other_name ?? 'Neko'} je otkazao/la razmenu: ${data.book_title ?? 'knjiga'}`,
  },
  price_drop: {
    icon: 'trending-down',
    color: '#E53935',
    bg: '#E5393522',
    title: 'Popust na knjizi!',
    getText: (data) =>
      `${data.title ?? 'Knjiga'} sada ${data.new_price} RSD (bilo ${data.old_price} RSD)`,
  },
  new_books: {
    icon: 'library',
    color: colors.mint,
    bg: colors.mint + '22',
    title: 'Nove knjige!',
    getText: (data) =>
      `${data.count ?? 0} novih knjiga dostupno`,
  },
  store_sale: {
    icon: 'pricetag',
    color: '#F57C00',
    bg: '#F57C0022',
    title: (data) => `Rasprodaja u ${data.store ?? 'prodavnici'}!`,
    getText: (data) =>
      `${data.count ?? 0} knjiga sa popustom`,
  },
};

function NotificationRow({ notification }) {
  const { type, data: dataStr, read, created_at } = notification;

  let data = {};
  try {
    data = typeof dataStr === 'string' ? JSON.parse(dataStr) : (dataStr ?? {});
  } catch {}

  const config = TYPE_CONFIG[type] ?? {
    icon: 'notifications',
    color: colors.muted,
    bg: colors.muted + '22',
    title: null,
    getText: () => 'Obaveštenje',
  };

  const titleText = typeof config.title === 'function'
    ? config.title(data)
    : config.title;

  return (
    <View style={[styles.row, !read && styles.rowUnread]}>
      {/* Unread dot */}
      <View style={styles.dotCol}>
        {!read && <View style={styles.unreadDot} />}
      </View>

      {/* Icon */}
      <View style={[styles.iconCircle, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>

      {/* Content */}
      <View style={styles.rowContent}>
        {titleText ? (
          <Text style={[styles.rowTitle, !read && styles.rowTextBold]}>
            {titleText}
          </Text>
        ) : null}
        <Text style={[styles.rowText, !read && styles.rowTextBold]}>
          {config.getText(data)}
        </Text>
        <Text style={styles.rowTime}>{relativeTime(created_at)}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;
      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('fetchNotifications error:', e);
    }
  }, []);

  async function markAllRead() {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;
      await fetch(`${BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch {}
  }

  useEffect(() => {
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Obaveštenja</Text>
        <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.markAllText}>Pročitano</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.violet} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="notifications-outline" size={38} color={colors.violet + '80'} />
          </View>
          <Text style={styles.emptyTitle}>Nema obaveštenja</Text>
          <Text style={styles.emptySubtitle}>Ovde ćeš videti obaveštenja o poklonima</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.violet} />
          }
          contentContainerStyle={styles.listContent}
        >
          {notifications.map(n => (
            <NotificationRow key={n.id} notification={n} />
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
  markAllBtn: { padding: 8 },
  markAllText: { fontSize: 13, color: colors.violet, fontWeight: '600' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingBottom: 60 },
  emptyIconBg: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.violet + '14',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.textDark },
  emptySubtitle: { fontSize: 13, color: colors.muted, textAlign: 'center', paddingHorizontal: 40 },

  listContent: { paddingTop: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  rowUnread: { backgroundColor: colors.violet + '08' },
  dotCol: { width: 8, alignItems: 'center' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.violet,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  rowContent: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  rowText: { fontSize: 14, color: colors.textDark, lineHeight: 20 },
  rowTextBold: { fontWeight: '600' },
  rowTime: { fontSize: 11, color: colors.muted },
});
