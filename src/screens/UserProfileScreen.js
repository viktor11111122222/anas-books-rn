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
  const [reviews,      setReviews]      = useState([]);
  const [exchange,     setExchange]     = useState([]);
  const [trustScore,   setTrustScore]   = useState(null);
  const [tab,          setTab]          = useState('wishlist');
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [openFolder,   setOpenFolder]   = useState(null);
  const [friendStatus, setFriendStatus] = useState('none');
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
        fetch(`${BASE_URL}/users/${userId}/reviews`).then(r => r.json()),
        fetch(`${BASE_URL}/exchange/user/${userId}`).then(r => r.json()).catch(() => []),
        fetch(`${BASE_URL}/exchange/ratings/${userId}`).then(r => r.json()).catch(() => null),
      ];
      if (token) {
        requests.push(
          fetch(`${BASE_URL}/friends/status/${userId}`, { headers }).then(r => r.json())
        );
      }

      const results = await Promise.all(requests);
      const [prof, wl, lib, revs, exch, ratingsData, statusData] = results;

      if (prof.message) { setError(prof.message); return; }
      setProfile(prof);
      setWishlist(wl.message ? { locked: true, reason: wl.message } : wl);
      setLibrary(lib.message ? { locked: true, reason: lib.message } : lib);
      setReviews(Array.isArray(revs) ? revs : []);
      setExchange(Array.isArray(exch) ? exch : []);
      if (ratingsData?.avg_score != null) setTrustScore(ratingsData.avg_score);
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

  async function handleGiftBook(bookId) {
    Alert.alert(
      'Pokloniti ovu knjigu?',
      `Poslati zahtev za poklon korisniku ${profile?.display_name ?? 'korisnik'}?`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Pokloni',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('auth_token');
              const res = await fetch(`${BASE_URL}/gifts`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bookId, toUserId: userId, message: '' }),
              });
              if (res.ok) {
                Alert.alert(
                  'Poklon poslat!',
                  `Zahtev za poklon je poslat! ${profile?.display_name ?? 'Korisnik'} će dobiti obaveštenje.`,
                );
              } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Greška', err.message || 'Poklon nije mogao biti poslat.');
              }
            } catch {
              Alert.alert('Greška', 'Proverite internet vezu.');
            }
          },
        },
      ],
    );
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
          {/* Owner private-profile notice */}
          {profile.is_own && !profile.profile_public && (
            <View style={styles.profilePrivateBanner}>
              <Ionicons name="eye-off" size={16} color="#7C5CBF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.profilePrivateBannerTitle}>Tvoj profil je privatan</Text>
                <Text style={styles.profilePrivateBannerSub}>Drugi korisnici ne mogu da te pronađu pretragom niti vide ovaj profil</Text>
              </View>
            </View>
          )}

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
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{profile.review_count ?? 0}</Text>
                <Text style={styles.statLabel}>Recenzije</Text>
              </View>
              {trustScore != null && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <View style={styles.trustStatRow}>
                      <Ionicons name="shield-checkmark" size={14} color={colors.mint} />
                      <Text style={[styles.statNum, { color: colors.mint, fontSize: 18 }]}>
                        {parseFloat(trustScore).toFixed(1)}
                      </Text>
                    </View>
                    <Text style={styles.statLabel}>Poverenje</Text>
                  </View>
                </>
              )}
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
              <Ionicons name="heart" size={13} color={tab === 'wishlist' ? colors.violet : colors.muted} />
              <Text style={[styles.tabText, tab === 'wishlist' && styles.tabTextActive]}>Wishlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'library' && styles.tabActive]}
              onPress={() => setTab('library')}
            >
              <Ionicons name="library" size={13} color={tab === 'library' ? colors.violet : colors.muted} />
              <Text style={[styles.tabText, tab === 'library' && styles.tabTextActive]}>Bibl.</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'reviews' && styles.tabActive]}
              onPress={() => setTab('reviews')}
            >
              <Ionicons name="star" size={13} color={tab === 'reviews' ? colors.violet : colors.muted} />
              <Text style={[styles.tabText, tab === 'reviews' && styles.tabTextActive]}>Recenzije</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'exchange' && styles.tabActive]}
              onPress={() => setTab('exchange')}
            >
              <Ionicons name="swap-horizontal" size={13} color={tab === 'exchange' ? colors.violet : colors.muted} />
              <Text style={[styles.tabText, tab === 'exchange' && styles.tabTextActive]}>Razmena</Text>
            </TouchableOpacity>
          </View>

          {/* Wishlist tab */}
          {tab === 'wishlist' && (
            !wishlist || wishlist.locked ? (
              <PrivateSection
                label={wishlist?.reason ?? 'Wishlist je privatan'}
                isOwn={profile.is_own}
                isFriend={friendStatus === 'friends'}
              />
            ) : openFolder ? (
              <FolderDetail
                folder={openFolder}
                books={(wishlist.books ?? []).filter(b => b.folder_id === openFolder.id)}
                onBack={() => setOpenFolder(null)}
                onBookPress={id => navigation.navigate('BookDetail', { bookId: id })}
                onBookGift={
                  profile && friendStatus === 'friends' && !profile.is_own
                    ? (bookId) => handleGiftBook(bookId)
                    : null
                }
              />
            ) : (
              <>
                {profile.is_own && !profile.wishlist_public && <OwnerPrivateBanner section="Wishlist" />}
                <WishlistView
                  folders={wishlist.folders ?? []}
                  books={wishlist.books ?? []}
                  onFolderPress={setOpenFolder}
                  onBookPress={id => navigation.navigate('BookDetail', { bookId: id })}
                  onBookGift={
                    profile && friendStatus === 'friends' && !profile.is_own
                      ? (bookId) => handleGiftBook(bookId)
                      : null
                  }
                />
              </>
            )
          )}

          {/* Library tab */}
          {tab === 'library' && (
            !library || library.locked ? (
              <PrivateSection
                label={library?.reason ?? 'Biblioteka je privatna'}
                isOwn={profile.is_own}
                isFriend={friendStatus === 'friends'}
              />
            ) : !Array.isArray(library) || library.length === 0 ? (
              <EmptySection label="Biblioteka je prazna" icon="library" />
            ) : (
              <>
                {profile.is_own && !profile.library_public && <OwnerPrivateBanner section="Biblioteka" />}
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
              </>
            )
          )}

          {/* Reviews tab */}
          {tab === 'reviews' && (
            reviews.length === 0 ? (
              <EmptySection label="Nema recenzija" icon="star-outline" />
            ) : (
              <View style={styles.listWrap}>
                {reviews.map(review => (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    onPress={() => navigation.navigate('BookDetail', { bookId: review.book.id })}
                  />
                ))}
              </View>
            )
          )}

          {/* Exchange tab */}
          {tab === 'exchange' && (
            exchange.length === 0 ? (
              <View style={styles.centered}>
                <Ionicons name="swap-horizontal-outline" size={36} color={colors.muted} />
                <Text style={styles.emptyTitle}>Nema oglasa za zamenu</Text>
                {profile.is_own && (
                  <Text style={styles.emptySubtitle}>Dodaj knjige u Razmena tabu da ih ponudiš</Text>
                )}
              </View>
            ) : (
              <View style={styles.listWrap}>
                {exchange.map(item => (
                  <ExchangeListingRow key={item.id} item={item} />
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

function WishlistView({ folders, books, onFolderPress, onBookPress, onBookGift }) {
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
        <BookRow
          key={item.id}
          item={item}
          onPress={() => onBookPress(item.id)}
          onGift={onBookGift ?? null}
        />
      ))}
    </View>
  );
}

function FolderDetail({ folder, books, onBack, onBookPress, onBookGift }) {
  return (
    <View>
      <TouchableOpacity style={styles.folderBackRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={16} color={colors.violet} />
        <Text style={styles.folderBackText}>{folder.name}</Text>
      </TouchableOpacity>
      {books.length === 0
        ? <EmptySection label="Folder je prazan" icon="folder-open-outline" />
        : (
          <View style={styles.listWrap}>
            {books.map(item => (
              <BookRow
                key={item.id}
                item={item}
                onPress={() => onBookPress(item.id)}
                onGift={onBookGift ?? null}
              />
            ))}
          </View>
        )
      }
    </View>
  );
}

function BookRow({ item, onPress, badge, onGift }) {
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
      {onGift && (
        <TouchableOpacity
          onPress={() => onGift(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.giftBtn}
        >
          <Ionicons name="gift-outline" size={18} color={colors.violet} />
        </TouchableOpacity>
      )}
      <Ionicons name="chevron-forward" size={16} color="#C0C0D8" />
    </TouchableOpacity>
  );
}

function StarRow({ rating }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Ionicons
          key={n}
          name={n <= rating ? 'star' : 'star-outline'}
          size={13}
          color={n <= rating ? colors.gold : colors.muted}
        />
      ))}
    </View>
  );
}

function ReviewRow({ review, onPress }) {
  const date = (() => {
    const d = new Date(review.updated_at);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('sr-RS', { year: 'numeric', month: 'short', day: 'numeric' });
  })();

  return (
    <TouchableOpacity style={styles.reviewCard} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.bookCover}>
        {review.book.cover_url ? (
          <ExpoImage source={{ uri: review.book.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
        ) : (
          <Ionicons name="book" size={22} color={colors.muted} />
        )}
      </View>
      <View style={styles.reviewInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{review.book.title}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{review.book.author}</Text>
        <StarRow rating={review.rating} />
        {review.comment ? (
          <Text style={styles.reviewComment} numberOfLines={3}>{review.comment}</Text>
        ) : null}
        {date ? <Text style={styles.reviewDate}>{date}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function OwnerPrivateBanner({ section }) {
  return (
    <View style={styles.ownerBanner}>
      <Ionicons name="eye-off-outline" size={15} color="#7C5CBF" />
      <Text style={styles.ownerBannerText}>
        {section} je privatna — drugi korisnici je ne vide
      </Text>
    </View>
  );
}

function PrivateSection({ label, isOwn, isFriend }) {
  const sub = isOwn
    ? 'Uključi ovu opciju u Podešavanjima profila'
    : isFriend
    ? 'Korisnik je isključio ovu sekciju'
    : 'Dodaj korisnika kao prijatelja da vidiš sadržaj';
  return (
    <View style={styles.centered}>
      <Ionicons name="lock-closed" size={36} color={colors.muted} />
      <Text style={styles.emptyTitle}>{label}</Text>
      <Text style={styles.emptySubtitle}>{sub}</Text>
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

function ExchangeStatusBadge({ status }) {
  const isActive = status === 'active' || status === 'dostupno';
  return (
    <View style={[styles.exBadge, { backgroundColor: isActive ? colors.mint + '22' : colors.muted + '22' }]}>
      <Text style={[styles.exBadgeText, { color: isActive ? colors.mint : colors.muted }]}>
        {isActive ? 'Dostupno' : 'Pauzirano'}
      </Text>
    </View>
  );
}

function ExchangeListingRow({ item }) {
  return (
    <View style={styles.bookRow}>
      <View style={styles.bookCover}>
        {item.book?.cover_url ? (
          <ExpoImage source={{ uri: item.book.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
        ) : (
          <Ionicons name="book" size={22} color={colors.muted} />
        )}
      </View>
      <View style={[styles.bookInfo, { gap: 5 }]}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.book?.title ?? '–'}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{item.book?.author ?? ''}</Text>
        <ExchangeStatusBadge status={item.status} />
        {item.notes ? <Text style={styles.exNotes} numberOfLines={2}>{item.notes}</Text> : null}
      </View>
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

  reviewCard:    { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 14, backgroundColor: colors.white, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  reviewInfo:    { flex: 1, gap: 5 },
  reviewComment: { fontSize: 13, color: '#4A4A6A', lineHeight: 18, marginTop: 2 },
  reviewDate:    { fontSize: 11, color: colors.muted, marginTop: 2 },

  emptyTitle:    { fontSize: 16, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: colors.muted, textAlign: 'center', paddingHorizontal: 32, marginTop: 4 },

  ownerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10, marginTop: 4,
    backgroundColor: '#F5F4FF', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  ownerBannerText: { fontSize: 13, color: colors.muted, flex: 1 },
  errorText:   { fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },

  profilePrivateBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginBottom: 12, marginTop: 8,
    backgroundColor: '#F0EEFF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: '#D6CEFD',
  },
  profilePrivateBannerTitle: { fontSize: 13, fontWeight: '700', color: '#7C5CBF', marginBottom: 2 },
  profilePrivateBannerSub:   { fontSize: 12, color: '#9C8EBF', lineHeight: 16 },

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

  trustStatRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  exBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7,
  },
  exBadgeText: { fontSize: 11, fontWeight: '700' },
  exNotes: { fontSize: 12, color: '#4A4A6A', lineHeight: 16, fontStyle: 'italic' },

  giftBtn: {
    padding: 6,
    marginRight: 2,
  },
});
