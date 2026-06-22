import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

function ModalSafeView({ children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.modalRoot}>
      <View style={{ height: insets.top, backgroundColor: colors.white }} />
      {children}
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function UserAvatar({ uri, name, size = 36 }) {
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

const STATUS_CONFIG = {
  pending:   { label: 'Na čekanju', bg: '#FFF8E1', text: '#B8860B' },
  accepted:  { label: 'Prihvaćen',  bg: colors.mint + '22', text: colors.mint },
  declined:  { label: 'Odbijen',    bg: colors.error + '18', text: colors.error },
  completed: { label: 'Završen',    bg: colors.mint + '18', text: '#2A9D7A' },
  cancelled: { label: 'Otkazan',    bg: colors.muted + '22', text: colors.muted },
};

function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: colors.muted + '20', text: colors.muted };
  return (
    <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusChipText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ── Rate modal ────────────────────────────────────────────────────────────────

function RateModal({ visible, request, onClose, onRated }) {
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (visible) { setRating(0); setComment(''); }
  }, [visible]);

  async function handleSubmit() {
    if (rating === 0) { Alert.alert('Greška', 'Izaberi ocenu od 1 do 5.'); return; }
    setSaving(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/exchange/rate/${request?.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Greška', data.message ?? 'Nije uspelo slanje ocene.');
      } else {
        Alert.alert('Hvala!', 'Ocena je uspešno poslata.');
        onRated?.();
        onClose();
      }
    } catch {
      Alert.alert('Greška', 'Proverite internet vezu.');
    }
    setSaving(false);
  }

  const otherUser = request?.other_user ?? request?.requester ?? request?.owner;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ModalSafeView>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>Odustani</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Oceni korisnika</Text>
            <View style={{ width: 70 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {otherUser ? (
              <View style={styles.rateUserRow}>
                <UserAvatar uri={otherUser.avatar_url} name={otherUser.display_name} size={44} />
                <Text style={styles.rateUserName}>{otherUser.display_name ?? 'Korisnik'}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Ocena</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name={n <= rating ? 'star' : 'star-outline'}
                    size={38}
                    color={n <= rating ? colors.gold : colors.muted}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Komentar (opciono)</Text>
            <TextInput
              style={styles.textArea}
              value={comment}
              onChangeText={setComment}
              placeholder="Napiši utisak o razmeni..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              maxLength={400}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.submitBtn, rating === 0 && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={rating === 0 || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color={colors.white} />
                : <>
                    <Ionicons name="star" size={16} color={colors.white} />
                    <Text style={styles.submitBtnText}>Pošalji ocenu</Text>
                  </>}
            </TouchableOpacity>
          </View>
        </ModalSafeView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────

function RequestCard({ request, isIncoming, onAction, onRate }) {
  const [acting, setActing] = useState(false);

  const book       = request.wanted_book ?? request.book;
  const otherUser  = isIncoming ? (request.requester ?? request.from_user) : (request.owner ?? request.to_user);
  const offeredBook = request.offered_book ?? null;

  async function doAction(endpoint) {
    setActing(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/exchange/request/${request.id}/${endpoint}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Greška', data.message ?? 'Nije uspelo.');
      } else {
        onAction?.();
      }
    } catch {
      Alert.alert('Greška', 'Proverite internet vezu.');
    }
    setActing(false);
  }

  return (
    <View style={styles.card}>
      {/* Book row */}
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
            <Ionicons name="book" size={24} color={colors.muted} />
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{book?.title ?? '–'}</Text>
          <Text style={styles.cardAuthor} numberOfLines={1}>{book?.author ?? ''}</Text>

          {offeredBook ? (
            <View style={styles.offeredRow}>
              <Ionicons name="swap-horizontal" size={12} color={colors.violet} />
              <Text style={styles.offeredText} numberOfLines={1}>nudi: {offeredBook.title}</Text>
            </View>
          ) : (
            <Text style={styles.noOfferText}>bez ponude</Text>
          )}

          <StatusChip status={request.status} />
        </View>
      </View>

      {/* User row */}
      {otherUser ? (
        <View style={styles.userRow}>
          <UserAvatar uri={otherUser.avatar_url} name={otherUser.display_name} size={28} />
          <Text style={styles.userName} numberOfLines={1}>{otherUser.display_name ?? 'Korisnik'}</Text>
          <TrustBadge score={otherUser.avg_trust_score} />
        </View>
      ) : null}

      {/* Message */}
      {request.message ? (
        <Text style={styles.messageText} numberOfLines={3}>{request.message}</Text>
      ) : null}

      {/* Actions */}
      {request.status === 'pending' && isIncoming && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.acceptBtn, acting && { opacity: 0.6 }]}
            onPress={() => doAction('accept')}
            disabled={acting}
            activeOpacity={0.85}
          >
            {acting
              ? <ActivityIndicator size="small" color={colors.white} />
              : <>
                  <Ionicons name="checkmark" size={15} color={colors.white} />
                  <Text style={styles.acceptBtnText}>Prihvati</Text>
                </>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.declineBtn, acting && { opacity: 0.6 }]}
            onPress={() => doAction('decline')}
            disabled={acting}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={15} color={colors.muted} />
            <Text style={styles.declineBtnText}>Odbij</Text>
          </TouchableOpacity>
        </View>
      )}

      {request.status === 'pending' && !isIncoming && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.cancelBtn, acting && { opacity: 0.6 }]}
            onPress={() => doAction('cancel')}
            disabled={acting}
            activeOpacity={0.8}
          >
            {acting
              ? <ActivityIndicator size="small" color={colors.muted} />
              : <>
                  <Ionicons name="close-circle-outline" size={15} color={colors.muted} />
                  <Text style={styles.cancelBtnText}>Otkaži zahtev</Text>
                </>}
          </TouchableOpacity>
        </View>
      )}

      {request.status === 'accepted' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.completeBtn, acting && { opacity: 0.6 }]}
            onPress={() => doAction('complete')}
            disabled={acting}
            activeOpacity={0.85}
          >
            {acting
              ? <ActivityIndicator size="small" color={colors.white} />
              : <>
                  <Ionicons name="checkmark-done" size={15} color={colors.white} />
                  <Text style={styles.completeBtnText}>Označi kao završeno</Text>
                </>}
          </TouchableOpacity>
        </View>
      )}

      {request.status === 'completed' && !request.rated && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.rateBtn} onPress={onRate} activeOpacity={0.85}>
            <Ionicons name="star-outline" size={15} color={colors.violet} />
            <Text style={styles.rateBtnText}>Oceni korisnika</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Tab contents ──────────────────────────────────────────────────────────────

function RequestsList({ requests, isIncoming, onAction, onRate }) {
  if (requests.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="mail-outline" size={32} color={colors.violet + '80'} />
        </View>
        <Text style={styles.emptyTitle}>
          {isIncoming ? 'Nema primljenih zahteva' : 'Nema poslatih zahteva'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isIncoming
            ? 'Ovde će se pojaviti zahtevi koje drugi šalju za tvoje knjige'
            : 'Zatraži zamenu na nečijem oglasu'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.listWrap}
      showsVerticalScrollIndicator={false}
    >
      {requests.map(req => (
        <RequestCard
          key={req.id}
          request={req}
          isIncoming={isIncoming}
          onAction={onAction}
          onRate={() => onRate(req)}
        />
      ))}
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ExchangeRequestsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { userSession } = useAuth();

  const [tab, setTab]           = useState('incoming');
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rateTarget, setRateTarget] = useState(null);

  const load = useCallback(async () => {
    if (!userSession) return;
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const res = await fetch(`${BASE_URL}/exchange/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setIncoming(Array.isArray(data?.incoming) ? data.incoming : []);
      setOutgoing(Array.isArray(data?.outgoing) ? data.outgoing : []);
    } catch {
      setIncoming([]);
      setOutgoing([]);
    }
    setLoading(false);
  }, [userSession]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zahtevi za zamenu</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab switch */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'incoming' && styles.tabBtnActive]}
          onPress={() => setTab('incoming')}
        >
          <Ionicons name="download-outline" size={14} color={tab === 'incoming' ? colors.violet : colors.muted} />
          <Text style={[styles.tabBtnText, tab === 'incoming' && styles.tabBtnTextActive]}>Primljeni</Text>
          {incoming.filter(r => r.status === 'pending').length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{incoming.filter(r => r.status === 'pending').length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'outgoing' && styles.tabBtnActive]}
          onPress={() => setTab('outgoing')}
        >
          <Ionicons name="upload-outline" size={14} color={tab === 'outgoing' ? colors.violet : colors.muted} />
          <Text style={[styles.tabBtnText, tab === 'outgoing' && styles.tabBtnTextActive]}>Poslati</Text>
        </TouchableOpacity>
      </View>

      {!userSession ? (
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={44} color={colors.muted} />
          <Text style={styles.emptyTitle}>Nisi prijavljen</Text>
          <Text style={styles.emptySubtitle}>Prijavi se da bi video zahteve</Text>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.violet} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.violet} />}
          scrollEnabled={false}
        >
          {tab === 'incoming' ? (
            <RequestsList
              requests={incoming}
              isIncoming
              onAction={load}
              onRate={req => setRateTarget(req)}
            />
          ) : (
            <RequestsList
              requests={outgoing}
              isIncoming={false}
              onAction={load}
              onRate={req => setRateTarget(req)}
            />
          )}
        </ScrollView>
      )}

      <RateModal
        visible={!!rateTarget}
        request={rateTarget}
        onClose={() => setRateTarget(null)}
        onRated={load}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10 },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.textDark, textAlign: 'center' },

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

  badge: {
    backgroundColor: colors.error, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.white },

  listWrap: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },

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
    width: 62, height: 88, borderRadius: 10,
    backgroundColor: '#EEEEf8', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  cardInfo: { flex: 1, gap: 5 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  cardAuthor: { fontSize: 12, color: colors.muted2 },

  offeredRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  offeredText: { fontSize: 12, color: colors.violet, fontStyle: 'italic', flex: 1 },
  noOfferText: { fontSize: 12, color: colors.muted, fontStyle: 'italic' },

  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8,
    marginTop: 2,
  },
  statusChipText: { fontSize: 11, fontWeight: '700' },

  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingBottom: 10,
  },
  userName: { fontSize: 13, fontWeight: '500', color: colors.textDark, flex: 1 },

  trustBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.muted + '18',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  trustText: { fontSize: 11, fontWeight: '600' },

  messageText: {
    fontSize: 13, color: '#4A4A6A', lineHeight: 18,
    marginHorizontal: 14, marginBottom: 10,
    fontStyle: 'italic',
  },

  actionsRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 14, marginBottom: 14,
  },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12, backgroundColor: colors.mint,
  },
  acceptBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  declineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#F0EFF8',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  declineBtnText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  cancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: colors.error + '10',
    borderWidth: 1, borderColor: colors.error + '30',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: colors.error },
  completeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12, backgroundColor: colors.violet,
  },
  completeBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  rateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: colors.violet + '14',
    borderWidth: 1, borderColor: colors.violet + '30',
  },
  rateBtnText: { fontSize: 13, fontWeight: '600', color: colors.violet },

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
  modalBody: { padding: 24, gap: 4 },
  modalFooter: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder,
    backgroundColor: colors.white,
  },

  rateUserRow: { alignItems: 'center', gap: 8, marginBottom: 24 },
  rateUserName: { fontSize: 17, fontWeight: '700', color: colors.textDark },

  starRow: {
    flexDirection: 'row', gap: 8, justifyContent: 'center',
    paddingVertical: 8, marginBottom: 4,
  },

  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  textArea: {
    backgroundColor: colors.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.cardBorder,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.textDark, minHeight: 100,
    textAlignVertical: 'top',
  },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.violet, borderRadius: 16, paddingVertical: 16,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: colors.white },
});
