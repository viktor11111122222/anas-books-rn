import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Dimensions, useWindowDimensions, FlatList, Modal,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TextInput, Share,
} from 'react-native';
import * as Linking from 'expo-linking';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedRef,
  interpolate,
  Extrapolation,
  scrollTo,
  runOnUI,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { InputField } from '../components/InputField';
import { BASE_URL } from '../utils/api';
import { colors } from '../utils/colors';

const { width: SCREEN_WIDTH_STATIC } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH_STATIC / 3;
const PAGES = ['Biblioteka', 'Profil', 'Wishlist'];

// ── Profile page container ────────────────────────────────────────────────────

const ReanimatedScrollView = Reanimated.createAnimatedComponent(ScrollView);

export function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const TAB_WIDTH = SCREEN_WIDTH / 3;
  const [page, setPage] = useState(1);
  const { syncWishlist } = useAuth();
  const scrollRef = useAnimatedRef();
  const scrollX = useSharedValue(SCREEN_WIDTH);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      scrollX.value = e.contentOffset.x;
    },
  });

  const indicatorAnimStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: interpolate(
        scrollX.value,
        [0, SCREEN_WIDTH, 2 * SCREEN_WIDTH],
        [0, TAB_WIDTH, 2 * TAB_WIDTH],
        Extrapolation.CLAMP,
      ),
    }],
  }));

  const tab0AnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, [0, SCREEN_WIDTH], [1, 0], Extrapolation.CLAMP),
  }));
  const tab1AnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, [0, SCREEN_WIDTH, 2 * SCREEN_WIDTH], [0, 1, 0], Extrapolation.CLAMP),
  }));
  const tab2AnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, [SCREEN_WIDTH, 2 * SCREEN_WIDTH], [0, 1], Extrapolation.CLAMP),
  }));
  const tabAnimStyles = [tab0AnimStyle, tab1AnimStyle, tab2AnimStyle];

  function goToPage(i) {
    setPage(i);
    if (i === 2) syncWishlist();
    runOnUI(() => {
      'worklet';
      scrollTo(scrollRef, i * SCREEN_WIDTH, 0, true);
    })();
  }

  const didInitScroll = React.useRef(false);
  function handlePagerLayout() {
    if (didInitScroll.current) return;
    didInitScroll.current = true;
    runOnUI(() => {
      'worklet';
      scrollTo(scrollRef, SCREEN_WIDTH, 0, false);
    })();
  }

  function onScrollEnd(e) {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / SCREEN_WIDTH);
    setPage(i);
    if (i === 2) syncWishlist();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Page selector */}
      <View style={styles.selector}>
        {PAGES.map((label, i) => (
          <TouchableOpacity key={label} style={styles.selectorTab} onPress={() => goToPage(i)}>
            <View style={styles.selectorTabInner}>
              <Text style={styles.selectorLabel}>{label}</Text>
              <Reanimated.View style={[StyleSheet.absoluteFill, tabAnimStyles[i], { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={styles.selectorLabelActive}>{label}</Text>
              </Reanimated.View>
            </View>
          </TouchableOpacity>
        ))}
        <Reanimated.View style={[styles.indicator, indicatorAnimStyle]} />
      </View>

      {/* Pages */}
      <ReanimatedScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        onMomentumScrollEnd={onScrollEnd}
        contentOffset={{ x: SCREEN_WIDTH, y: 0 }}
        onLayout={handlePagerLayout}
        style={{ flex: 1 }}
      >
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <LibraryPage navigation={navigation} />
        </View>
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ProfilePage navigation={navigation} />
        </View>
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <WishlistPage navigation={navigation} />
        </View>
      </ReanimatedScrollView>
    </View>
  );
}

// ── Library page ──────────────────────────────────────────────────────────────

function LibraryPage({ navigation }) {
  const { libraryBooks, toggleLibrary, syncLibrary, setLibraryBookPrivacy } = useAuth();

  useEffect(() => { syncLibrary(); }, []);

  if (libraryBooks.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconBg}>
          <Ionicons name="library" size={34} color={colors.mint + '80'} />
        </View>
        <Text style={styles.emptyTitle}>Biblioteka je prazna</Text>
        <Text style={styles.emptySubtitle}>Otvori neku knjigu i pritisni{'\n'}"Dodaj u biblioteku"</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={libraryBooks}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.wishlistRow}
          onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
          activeOpacity={0.9}
        >
          <View style={styles.wishlistCover}>
            {item.cover_url ? (
              <ExpoImage
                source={{ uri: item.cover_url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <Ionicons name="book" size={24} color={colors.muted} />
            )}
          </View>
          <View style={styles.wishlistInfo}>
            <Text style={styles.wishlistTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.wishlistAuthor} numberOfLines={1}>{item.author}</Text>
            <View style={styles.libraryBadge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.mint} />
              <Text style={styles.libraryBadgeText}>Pročitano</Text>
            </View>
          </View>
          <View style={{ gap: 10, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setLibraryBookPrivacy(item.id, !item.is_private)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name={item.is_private ? 'lock-closed' : 'lock-open-outline'}
                size={18}
                color={item.is_private ? colors.violet : colors.muted}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleLibrary(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle-outline" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

// ── Wishlist page ─────────────────────────────────────────────────────────────

function WishlistPage({ navigation }) {
  const {
    wishlistBooks, wishlistFolders,
    toggleWishlist, syncWishlist,
    createWishlistFolder, renameWishlistFolder, deleteWishlistFolder, moveBookToFolder,
    setBookPrivacy, setFolderPrivacy,
  } = useAuth();

  const [selectedFolder, setSelectedFolder] = useState(null);
  const [nameModal, setNameModal]   = useState(null);
  const [nameInput, setNameInput]   = useState('');
  const [moveModal, setMoveModal]   = useState(null);

  useEffect(() => { syncWishlist(); }, []);

  const hasFolders    = wishlistFolders.length > 0;
  const uncategorized = wishlistBooks.filter(b => !b.folder_id);

  function openCreate() { setNameInput(''); setNameModal({ mode: 'create' }); }
  function openRename(folder) { setNameInput(folder.name); setNameModal({ mode: 'rename', folderId: folder.id }); }

  async function handleNameSave() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    if (nameModal.mode === 'create') await createWishlistFolder(trimmed);
    else await renameWishlistFolder(nameModal.folderId, trimmed);
    setNameModal(null);
  }

  function handleFolderMenu(folder) {
    const isPrivate = !!folder.is_private;
    Alert.alert(folder.name, '', [
      { text: 'Preimenuj', onPress: () => openRename(folder) },
      {
        text: isPrivate ? '🔓 Postavi javnim' : '🔒 Postavi privatnim',
        onPress: () => setFolderPrivacy(folder.id, !isPrivate),
      },
      {
        text: 'Obriši folder', style: 'destructive',
        onPress: () => Alert.alert('Obriši folder', 'Knjige ostaju u wishlistu bez foldera.', [
          { text: 'Odustani', style: 'cancel' },
          { text: 'Obriši', style: 'destructive', onPress: () => {
            if (selectedFolder?.id === folder.id) setSelectedFolder(null);
            deleteWishlistFolder(folder.id);
          }},
        ]),
      },
      { text: 'Odustani', style: 'cancel' },
    ]);
  }

  const movingBook = moveModal ? wishlistBooks.find(b => b.id === moveModal) : null;

  // ── Folder detail view ─────────────────────────────────────────────────────
  if (selectedFolder) {
    const folderBooks = wishlistBooks.filter(b => b.folder_id === selectedFolder.id);
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.folderDetailNav}>
          <TouchableOpacity onPress={() => setSelectedFolder(null)} style={styles.folderDetailBack}>
            <Ionicons name="chevron-back" size={20} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.folderDetailTitle} numberOfLines={1}>{selectedFolder.name}</Text>
          <TouchableOpacity onPress={() => handleFolderMenu(selectedFolder)} style={styles.folderDetailMenu}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {folderBooks.length === 0 ? (
          <View style={styles.centered}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.violet + '14' }]}>
              <Ionicons name="folder-open" size={36} color={colors.violet + '59'} />
            </View>
            <Text style={styles.emptyTitle}>Folder je prazan</Text>
            <Text style={styles.emptySubtitle}>Dodaj knjige u ovaj folder{'\n'}pri dodavanju u wishlist</Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {folderBooks.map(item => (
              <WishlistBookRow
                key={item.id}
                item={item}
                hasFolders
                onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
                onRemove={() => toggleWishlist(item.id)}
                onMove={() => setMoveModal(item.id)}
                onTogglePrivacy={() => setBookPrivacy(item.id, !item.is_private)}
              />
            ))}
          </ScrollView>
        )}

        <MoveModal
          visible={!!moveModal}
          movingBook={movingBook}
          wishlistFolders={wishlistFolders}
          onMove={(folderId) => { moveBookToFolder(moveModal, folderId); setMoveModal(null); }}
          onClose={() => setMoveModal(null)}
        />
        <FolderNameModal
          visible={!!nameModal}
          value={nameInput}
          onChange={setNameInput}
          onSave={handleNameSave}
          onClose={() => setNameModal(null)}
          title={nameModal?.mode === 'create' ? 'Novi folder' : 'Preimenuj folder'}
        />
      </View>
    );
  }

  // ── Main wishlist view ─────────────────────────────────────────────────────
  if (wishlistBooks.length === 0 && !hasFolders) {
    return (
      <View style={styles.centered}>
        <View style={[styles.emptyIconBg, { backgroundColor: colors.violet + '14' }]}>
          <Ionicons name="heart" size={36} color={colors.violet + '59'} />
        </View>
        <Text style={styles.emptyTitle}>Wishlist je prazan</Text>
        <Text style={styles.emptySubtitle}>Pritisni srce na knjizi{'\n'}da je dodaš ovde</Text>
        <TouchableOpacity style={[styles.newFolderBtn, { marginTop: 20 }]} onPress={openCreate}>
          <Ionicons name="folder-open-outline" size={15} color={colors.violet} />
          <Text style={styles.newFolderBtnText}>Napravi folder</Text>
        </TouchableOpacity>
        <FolderNameModal
          visible={!!nameModal}
          value={nameInput}
          onChange={setNameInput}
          onSave={handleNameSave}
          onClose={() => setNameModal(null)}
          title="Novi folder"
        />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* New folder button */}
      <View style={styles.wlHeader}>
        <TouchableOpacity style={styles.newFolderBtn} onPress={openCreate}>
          <Ionicons name="folder-open-outline" size={14} color={colors.violet} />
          <Text style={styles.newFolderBtnText}>Novi folder</Text>
        </TouchableOpacity>
      </View>

      {/* Folder cards */}
      {wishlistFolders.map(folder => {
        const count = wishlistBooks.filter(b => b.folder_id === folder.id).length;
        return (
          <TouchableOpacity
            key={folder.id}
            style={styles.folderCard}
            onPress={() => setSelectedFolder(folder)}
            activeOpacity={0.82}
          >
            <View style={styles.folderCardIcon}>
              <Ionicons name="folder" size={24} color={colors.violet} />
              {!!folder.is_private && (
                <View style={styles.folderLockBadge}>
                  <Ionicons name="lock-closed" size={8} color={colors.white} />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.folderCardName}>{folder.name}</Text>
              <Text style={styles.folderCardSub}>
                {count === 0 ? 'Prazan' : `${count} ${count === 1 ? 'knjiga' : count < 5 ? 'knjige' : 'knjiga'}`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleFolderMenu(folder)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={16} color="#C0C0D8" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        );
      })}

      {/* Uncategorized books */}
      {uncategorized.length > 0 && (
        <View>
          {hasFolders && (
            <Text style={styles.wlSectionLabel}>BEZ FOLDERA</Text>
          )}
          {uncategorized.map(item => (
            <WishlistBookRow
              key={item.id}
              item={item}
              hasFolders={hasFolders}
              onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
              onRemove={() => toggleWishlist(item.id)}
              onMove={() => setMoveModal(item.id)}
              onTogglePrivacy={() => setBookPrivacy(item.id, !item.is_private)}
            />
          ))}
        </View>
      )}

      <FolderNameModal
        visible={!!nameModal}
        value={nameInput}
        onChange={setNameInput}
        onSave={handleNameSave}
        onClose={() => setNameModal(null)}
        title={nameModal?.mode === 'create' ? 'Novi folder' : 'Preimenuj folder'}
      />
      <MoveModal
        visible={!!moveModal}
        movingBook={movingBook}
        wishlistFolders={wishlistFolders}
        onMove={(folderId) => { moveBookToFolder(moveModal, folderId); setMoveModal(null); }}
        onClose={() => setMoveModal(null)}
      />
    </ScrollView>
  );
}

function WishlistBookRow({ item, hasFolders, onPress, onRemove, onMove, onTogglePrivacy }) {
  const isPrivate = !!item.is_private;
  return (
    <TouchableOpacity style={styles.wishlistRow} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.wishlistCover}>
        {item.cover_url ? (
          <ExpoImage source={{ uri: item.cover_url }} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="disk" />
        ) : (
          <Ionicons name="book" size={24} color={colors.muted} />
        )}
      </View>
      <View style={styles.wishlistInfo}>
        <Text style={styles.wishlistTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.wishlistAuthor} numberOfLines={1}>{item.author}</Text>
        {item.min_price != null && <Text style={styles.wishlistPrice}>{item.min_price} RSD</Text>}
      </View>
      <View style={{ gap: 10, alignItems: 'center' }}>
        <TouchableOpacity onPress={onTogglePrivacy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name={isPrivate ? 'lock-closed' : 'lock-open-outline'}
            size={18}
            color={isPrivate ? colors.violet : colors.muted}
          />
        </TouchableOpacity>
        {hasFolders && (
          <TouchableOpacity onPress={onMove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="folder-open-outline" size={19} color={colors.muted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="heart" size={20} color={colors.heartRed} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function MoveModal({ visible, movingBook, wishlistFolders, onMove, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Premesti u folder</Text>
          <TouchableOpacity style={styles.sheetRow} onPress={() => onMove(null)}>
            <Ionicons name="albums-outline" size={18} color={colors.muted} />
            <Text style={styles.sheetRowText}>Bez foldera</Text>
            {movingBook?.folder_id == null && <Ionicons name="checkmark" size={16} color={colors.violet} style={{ marginLeft: 'auto' }} />}
          </TouchableOpacity>
          {wishlistFolders.map(f => (
            <TouchableOpacity key={f.id} style={styles.sheetRow} onPress={() => onMove(f.id)}>
              <Ionicons name="folder" size={18} color={colors.violet} />
              <Text style={styles.sheetRowText}>{f.name}</Text>
              {movingBook?.folder_id === f.id && <Ionicons name="checkmark" size={16} color={colors.violet} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function FolderNameModal({ visible, value, onChange, onSave, onClose, title }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.nameModalCard}>
          <Text style={styles.nameModalTitle}>{title}</Text>
          <TextInput
            style={styles.nameModalInput}
            value={value}
            onChangeText={onChange}
            placeholder="Naziv foldera"
            placeholderTextColor={colors.muted}
            autoFocus
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={onSave}
          />
          <View style={styles.nameModalActions}>
            <TouchableOpacity style={styles.nameModalCancel} onPress={onClose}>
              <Text style={styles.nameModalCancelText}>Odustani</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nameModalSave} onPress={onSave}>
              <Text style={styles.nameModalSaveText}>Sačuvaj</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Avatar with graceful fallback ─────────────────────────────────────────────

function AvatarView({ uri, initial, style }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [uri]);
  if (uri && !failed) {
    return (
      <ExpoImage
        source={{ uri }}
        style={[style, { overflow: 'hidden' }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <LinearGradient colors={[colors.violet, colors.sky]} style={style}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </LinearGradient>
  );
}

// ── Profile page ──────────────────────────────────────────────────────────────

function ProfilePage({ navigation }) {
  const { userSession, profile, fetchMe, signOut, updateDisplayName, updatePrivacySettings, uploadAvatar, isLoading, errorMessage, clearError } = useAuth();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showReviews, setShowReviews] = useState(false);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [showRecent, setShowRecent] = useState(false);
  const [recentBooks, setRecentBooks] = useState([]);

  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [myToken, setMyToken] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);


  const loadMyReviews = useCallback(async () => {
    if (!userSession?.id) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/users/${userSession.id}/reviews`);
      const data = await res.json();
      setMyReviews(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('loadMyReviews error:', e);
    }
    setReviewsLoading(false);
  }, [userSession?.id]);

  const loadRecentBooks = useCallback(async () => {
    try {
      const val = await AsyncStorage.getItem('recently_viewed');
      setRecentBooks(val ? JSON.parse(val) : []);
    } catch {}
  }, []);

  const loadStats = useCallback(async () => {
    if (!userSession?.id) return;
    setStatsLoading(true);
    try {
      const [profileRes, reviewsRes] = await Promise.all([
        fetch(`${BASE_URL}/users/${userSession.id}`),
        fetch(`${BASE_URL}/users/${userSession.id}/reviews`),
      ]);
      const profileData = await profileRes.json();
      const reviewsData = await reviewsRes.json();
      const reviews = Array.isArray(reviewsData) ? reviewsData : [];
      const avgRating = reviews.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null;
      setStatsData({
        library_count:  profileData.library_count  ?? 0,
        wishlist_count: profileData.wishlist_count ?? 0,
        review_count:   profileData.review_count   ?? 0,
        avg_rating:     avgRating,
      });
    } catch (e) {
      console.error('loadStats error:', e);
    }
    setStatsLoading(false);
  }, [userSession?.id]);

  const loadFriendsData = useCallback(async () => {
    if (!userSession) return;
    setFriendsLoading(true);
    try {
      const authToken = await SecureStore.getItemAsync('auth_token');
      if (!authToken) return;
      const headers = { Authorization: `Bearer ${authToken}` };
      const [tokenRes, friendsRes, requestsRes] = await Promise.all([
        fetch(`${BASE_URL}/friends/my-token`, { headers }),
        fetch(`${BASE_URL}/friends`, { headers }),
        fetch(`${BASE_URL}/friends/requests`, { headers }),
      ]);
      const [tokenData, friendsData, requestsData] = await Promise.all([
        tokenRes.json().catch(() => ({})),
        friendsRes.json().catch(() => []),
        requestsRes.json().catch(() => []),
      ]);
      if (tokenData.token) setMyToken(tokenData.token);
      setFriends(Array.isArray(friendsData) ? friendsData : []);
      setPendingRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch {}
    setFriendsLoading(false);
  }, [userSession]);

  async function copyInviteLink() {
    if (!myToken) return;
    const url = Linking.createURL(`invite/${myToken}`);
    await Share.share({ message: url, title: 'Poziv za prijatelje' });
  }

  async function respondToRequest(id, action) {
    try {
      const authToken = await SecureStore.getItemAsync('auth_token');
      await fetch(`${BASE_URL}/friends/requests/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      await loadFriendsData();
    } catch {
      Alert.alert('Greška', 'Nije uspelo. Pokušaj ponovo.');
    }
  }

  async function removeFriend(userId, name) {
    Alert.alert('Ukloni prijatelja', `Ukloniti ${name || 'ovog korisnika'} iz prijatelja?`, [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Ukloni', style: 'destructive',
        onPress: async () => {
          try {
            const authToken = await SecureStore.getItemAsync('auth_token');
            await fetch(`${BASE_URL}/friends/${userId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${authToken}` },
            });
            await loadFriendsData();
          } catch {
            Alert.alert('Greška', 'Nije uspelo. Pokušaj ponovo.');
          }
        },
      },
    ]);
  }

  useEffect(() => {
    fetchMe();
    loadFriendsData();
    AsyncStorage.getItem('pref_notifications').then(v => setNotificationsOn(v === 'true'));
  }, []);

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Potrebna dozvola', 'Dozvoli pristup galeriji u podešavanjima uređaja.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [1, 1], quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUploading(true);
      await uploadAvatar(result.assets[0].uri);
      setAvatarUploading(false);
    }
  }

  const displayName = userSession?.display_name || profile?.display_name || '';
  const initial = displayName?.[0]?.toUpperCase() || userSession?.email?.[0]?.toUpperCase() || '?';

  function startEditName() {
    setNameInput(displayName);
    clearError();
    setEditingName(true);
  }

  async function saveNameEdit() {
    const ok = await updateDisplayName(nameInput);
    if (ok) setEditingName(false);
  }

  function cancelNameEdit() {
    setEditingName(false);
    clearError();
  }

  const memberSince = (() => {
    const raw = profile?.created_at;
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('sr-RS', { year: 'numeric', month: 'long', day: 'numeric' });
  })();

  return (
    <>
      <ScrollView contentContainerStyle={styles.profileScroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarCard}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={pickAvatar} activeOpacity={0.85} disabled={avatarUploading}>
            <AvatarView uri={userSession?.avatar_url} initial={initial} style={styles.avatar} />
            <View style={styles.cameraBadge}>
              {avatarUploading
                ? <ActivityIndicator size="small" color={colors.violet} style={{ width: 12, height: 12 }} />
                : <Ionicons name="camera" size={12} color={colors.violet} />
              }
            </View>
          </TouchableOpacity>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={v => { setNameInput(v); clearError(); }}
                autoFocus
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={saveNameEdit}
                placeholder="Ime ili nadimak"
                placeholderTextColor={colors.muted}
              />
              <TouchableOpacity onPress={saveNameEdit} disabled={isLoading} style={styles.nameActionBtn}>
                {isLoading
                  ? <ActivityIndicator size="small" color={colors.violet} />
                  : <Ionicons name="checkmark" size={18} color={colors.violet} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelNameEdit} style={styles.nameActionBtn}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.nameRow} onPress={startEditName} activeOpacity={0.7}>
              <Text style={styles.avatarName}>{displayName || 'Dodaj ime'}</Text>
              <Ionicons name="pencil" size={13} color={colors.muted} style={{ marginTop: 2 }} />
            </TouchableOpacity>
          )}
          {errorMessage && editingName ? (
            <Text style={styles.nameError}>{errorMessage}</Text>
          ) : null}
          <Text style={styles.avatarEmail}>{userSession?.email ?? ''}</Text>
          {memberSince ? <Text style={styles.avatarSince}>Član od {memberSince}</Text> : null}
        </View>

        {/* Account section */}
        <ProfileSection title="NALOG">
          <ProfileRow icon="mail" iconColor={colors.violet} label="Email">
            <Text style={styles.rowValue} numberOfLines={1}>{userSession?.email ?? ''}</Text>
          </ProfileRow>
          {profile?.has_password !== false && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity onPress={() => setShowChangePwd(true)}>
                <ProfileRow icon="lock-closed" iconColor={colors.sky} label="Promeni lozinku">
                  <Ionicons name="chevron-forward" size={14} color="#C8C8DC" />
                </ProfileRow>
              </TouchableOpacity>
            </>
          )}
        </ProfileSection>

        {/* Settings section */}
        <ProfileSection title="PODEŠAVANJA">
          <View style={styles.rowContainer}>
            <View style={[styles.iconBox, { backgroundColor: colors.mint + '1F' }]}>
              <Ionicons name="notifications" size={16} color={colors.mint} />
            </View>
            <Text style={styles.rowLabel}>Notifikacije</Text>
            <Switch
              value={notificationsOn}
              onValueChange={(v) => {
                setNotificationsOn(v);
                AsyncStorage.setItem('pref_notifications', String(v));
                if (!v) {
                  Alert.alert(
                    'Isključi notifikacije',
                    'Da potpuno isključiš notifikacije, idi u Podešavanja → Anas Books.',
                    [
                      { text: 'Otkaži', style: 'cancel' },
                      { text: 'Otvori podešavanja', onPress: () => Linking.openSettings() },
                    ]
                  );
                }
              }}
              trackColor={{ false: '#D0D0D8', true: colors.mint }}
              thumbColor={colors.white}
            />
          </View>
        </ProfileSection>

        {/* Friends section */}
        <ProfileSection title="PRIJATELJI">
          {/* Share invite link */}
          <TouchableOpacity onPress={copyInviteLink} disabled={!myToken || friendsLoading} activeOpacity={0.75}>
            <ProfileRow icon="link" iconColor={colors.violet} label="Pozovi prijatelja">
              {friendsLoading
                ? <ActivityIndicator size="small" color={colors.muted} />
                : <Ionicons name="share-outline" size={18} color={colors.muted} />}
            </ProfileRow>
          </TouchableOpacity>

          {/* Pending incoming requests */}
          {pendingRequests.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.friendsSubHeader}>
                <Text style={styles.friendsSubLabel}>ZAHTEVI</Text>
                <View style={styles.requestBadge}>
                  <Text style={styles.requestBadgeText}>{pendingRequests.length}</Text>
                </View>
              </View>
              {pendingRequests.map((req, i) => (
                <React.Fragment key={req.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.friendRequestRow}>
                    <FriendAvatar uri={req.user.avatar_url} name={req.user.display_name} size={36} />
                    <Text style={styles.friendName} numberOfLines={1}>
                      {req.user.display_name || 'Korisnik'}
                    </Text>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => respondToRequest(req.id, 'accept')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => respondToRequest(req.id, 'decline')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close" size={16} color={colors.muted} />
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              ))}
            </>
          )}

          {/* Friends list */}
          {friends.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.friendsSubHeader}>
                <Text style={styles.friendsSubLabel}>PRIJATELJI</Text>
                <Text style={styles.friendsCount}>{friends.length}</Text>
              </View>
              {friends.map((f, i) => (
                <React.Fragment key={f.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.friendRow}>
                    <FriendAvatar uri={f.avatar_url} name={f.display_name} size={36} />
                    <Text style={styles.friendName} numberOfLines={1}>
                      {f.display_name || 'Korisnik'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFriend(f.id, f.display_name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="person-remove-outline" size={18} color={colors.muted} />
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              ))}
            </>
          )}

          {!friendsLoading && friends.length === 0 && pendingRequests.length === 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.noFriendsRow}>
                <Text style={styles.noFriendsText}>Još nema prijatelja — kopiraj link i pošalji ga!</Text>
              </View>
            </>
          )}
        </ProfileSection>

        {/* Privacy section */}
        <ProfileSection title="PRIVATNOST">
          <View style={styles.rowContainer}>
            <View style={[styles.iconBox, { backgroundColor: colors.violet + '1F' }]}>
              <Ionicons name="person" size={16} color={colors.violet} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Javni profil</Text>
              <Text style={styles.privacyHint}>Drugi korisnici mogu da pronađu tvoj profil</Text>
            </View>
            <Switch
              value={!!(userSession?.profile_public ?? 1)}
              onValueChange={v => updatePrivacySettings({ profilePublic: v })}
              trackColor={{ false: '#D0D0D8', true: colors.violet }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.rowContainer}>
            <View style={[styles.iconBox, { backgroundColor: colors.sky + '1F' }]}>
              <Ionicons name="library" size={16} color={colors.sky} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Javna biblioteka</Text>
              <Text style={styles.privacyHint}>Drugi vide knjige koje si pročitao</Text>
            </View>
            <Switch
              value={!!(userSession?.library_public ?? 1)}
              onValueChange={v => updatePrivacySettings({ libraryPublic: v })}
              trackColor={{ false: '#D0D0D8', true: colors.sky }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.rowContainer}>
            <View style={[styles.iconBox, { backgroundColor: colors.heartRed + '1F' }]}>
              <Ionicons name="heart" size={16} color={colors.heartRed} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Javni wishlist</Text>
              <Text style={styles.privacyHint}>Drugi vide tvoje javne knjige i foldere</Text>
            </View>
            <Switch
              value={!!(userSession?.wishlist_public ?? 1)}
              onValueChange={v => updatePrivacySettings({ wishlistPublic: v })}
              trackColor={{ false: '#D0D0D8', true: colors.heartRed }}
              thumbColor={colors.white}
            />
          </View>
        </ProfileSection>

        {/* Activity */}
        <ProfileSection title="AKTIVNOST">
          <TouchableOpacity onPress={() => { setShowReviews(true); loadMyReviews(); }} activeOpacity={0.75}>
            <ProfileRow icon="star" iconColor={colors.gold} label="Moje recenzije">
              <Ionicons name="chevron-forward" size={14} color="#C8C8DC" />
            </ProfileRow>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => { setShowRecent(true); loadRecentBooks(); }} activeOpacity={0.75}>
            <ProfileRow icon="time" iconColor={colors.sky} label="Nedavno pregledano">
              <Ionicons name="chevron-forward" size={14} color="#C8C8DC" />
            </ProfileRow>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => { setShowStats(true); loadStats(); }} activeOpacity={0.75}>
            <ProfileRow icon="bar-chart" iconColor={colors.mint} label="Statistike čitanja">
              <Ionicons name="chevron-forward" size={14} color="#C8C8DC" />
            </ProfileRow>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => navigation.navigate('Exchange')} activeOpacity={0.75}>
            <ProfileRow icon="swap-horizontal" iconColor="#7C5CBF" label="Razmena knjiga">
              <Ionicons name="chevron-forward" size={14} color="#C8C8DC" />
            </ProfileRow>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} activeOpacity={0.75}>
            <ProfileRow icon="notifications" iconColor={colors.sky} label="Obaveštenja">
              <Ionicons name="chevron-forward" size={14} color="#C8C8DC" />
            </ProfileRow>
          </TouchableOpacity>
        </ProfileSection>

        {/* Info section */}
        <ProfileSection title="INFORMACIJE">
          <ProfileRow icon="star" iconColor="#F5A623" label="Oceni aplikaciju">
            <Ionicons name="chevron-forward" size={14} color="#C8C8DC" />
          </ProfileRow>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <ProfileRow icon="shield-checkmark" iconColor={colors.violet} label="Politika privatnosti">
              <Ionicons name="chevron-forward" size={14} color="#C8C8DC" />
            </ProfileRow>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
            <ProfileRow icon="document-text" iconColor={colors.sky} label="Uslovi korišćenja">
              <Ionicons name="chevron-forward" size={14} color="#C8C8DC" />
            </ProfileRow>
          </TouchableOpacity>
          <View style={styles.divider} />
          <ProfileRow icon="information-circle" iconColor={colors.muted} label="O aplikaciji">
            <Text style={styles.rowValue}>Verzija 1.0</Text>
          </ProfileRow>
        </ProfileSection>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={17} color={colors.error} />
          <Text style={styles.signOutText}>Odjavi se</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ChangePasswordModal visible={showChangePwd} onClose={() => setShowChangePwd(false)} />
      <MyReviewsModal
        visible={showReviews}
        onClose={() => setShowReviews(false)}
        reviews={myReviews}
        loading={reviewsLoading}
        onBookPress={id => { setShowReviews(false); navigation.navigate('BookDetail', { bookId: id }); }}
      />
      <RecentlyViewedModal
        visible={showRecent}
        onClose={() => setShowRecent(false)}
        books={recentBooks}
        onBookPress={id => { setShowRecent(false); navigation.navigate('BookDetail', { bookId: id }); }}
      />
      <StatsModal
        visible={showStats}
        onClose={() => setShowStats(false)}
        data={statsData}
        loading={statsLoading}
      />
    </>
  );
}

// ── Profile helpers ───────────────────────────────────────────────────────────

function FriendAvatar({ uri, name, size = 36 }) {
  const [failed, setFailed] = React.useState(false);
  const initial = (name || '?')[0].toUpperCase();
  if (uri && !failed) {
    return (
      <ExpoImage
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
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

function ProfileSection({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function ProfileRow({ icon, iconColor, label, children }) {
  return (
    <View style={styles.rowContainer}>
      <View style={[styles.iconBox, { backgroundColor: iconColor + '1F' }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ModalSafeView({ children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.modalRoot}>
      <View style={{ height: insets.top, backgroundColor: colors.white }} />
      {children}
    </View>
  );
}

// ── My Reviews Modal ──────────────────────────────────────────────────────────

function MyReviewsModal({ visible, onClose, reviews, loading, onBookPress }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ModalSafeView>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>Zatvori</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Moje recenzije</Text>
          <View style={{ width: 70 }} />
        </View>

        {loading ? (
          <View style={styles.reviewsCenter}>
            <ActivityIndicator size="large" color={colors.violet} />
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.reviewsCenter}>
            <Ionicons name="star-outline" size={44} color={colors.muted} />
            <Text style={styles.reviewsEmpty}>Još nisi napisao recenziju</Text>
            <Text style={styles.reviewsEmptySub}>Dodaj knjigu u biblioteku i oceni je</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.reviewsList} showsVerticalScrollIndicator={false}>
            {reviews.map(r => (
              <TouchableOpacity key={r.id} style={styles.reviewCard} onPress={() => onBookPress(r.book.id)} activeOpacity={0.88}>
                <View style={styles.reviewCover}>
                  {r.book.cover_url ? (
                    <ExpoImage source={{ uri: r.book.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
                  ) : (
                    <Ionicons name="book" size={22} color={colors.muted} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.reviewBookTitle} numberOfLines={2}>{r.book.title}</Text>
                  <Text style={styles.reviewBookAuthor} numberOfLines={1}>{r.book.author}</Text>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Ionicons key={n} name={n <= r.rating ? 'star' : 'star-outline'} size={13} color={n <= r.rating ? colors.gold : colors.muted} />
                    ))}
                  </View>
                  {r.comment ? <Text style={styles.reviewComment} numberOfLines={3}>{r.comment}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={15} color="#C8C8DC" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ModalSafeView>
    </Modal>
  );
}

// ── Recently Viewed Modal ─────────────────────────────────────────────────────

function RecentlyViewedModal({ visible, onClose, books, onBookPress }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ModalSafeView>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>Zatvori</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Nedavno pregledano</Text>
          <View style={{ width: 70 }} />
        </View>

        {books.length === 0 ? (
          <View style={styles.reviewsCenter}>
            <Ionicons name="time-outline" size={44} color={colors.muted} />
            <Text style={styles.reviewsEmpty}>Još nisi pregledao knjige</Text>
            <Text style={styles.reviewsEmptySub}>Knjige koje otvoriš pojaviće se ovde</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.reviewsList} showsVerticalScrollIndicator={false}>
            {books.map(b => (
              <TouchableOpacity key={b.id} style={styles.reviewCard} onPress={() => onBookPress(b.id)} activeOpacity={0.88}>
                <View style={styles.reviewCover}>
                  {b.cover_url ? (
                    <ExpoImage source={{ uri: b.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
                  ) : (
                    <Ionicons name="book" size={22} color={colors.muted} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.reviewBookTitle} numberOfLines={2}>{b.title}</Text>
                  <Text style={styles.reviewBookAuthor} numberOfLines={1}>{b.author}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#C8C8DC" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ModalSafeView>
    </Modal>
  );
}

// ── Stats Modal ───────────────────────────────────────────────────────────────

function StatsModal({ visible, onClose, data, loading }) {
  const stats = [
    { icon: 'library', color: colors.violet, label: 'Knjige u biblioteci', value: data?.library_count ?? '–' },
    { icon: 'heart',   color: colors.heartRed, label: 'Na wishlist-i', value: data?.wishlist_count ?? '–' },
    { icon: 'star',    color: colors.gold, label: 'Recenzije', value: data?.review_count ?? '–' },
    { icon: 'trophy',  color: colors.mint, label: 'Prosečna ocena', value: data?.avg_rating ? `${data.avg_rating} / 5` : '–' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ModalSafeView>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>Zatvori</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Statistike čitanja</Text>
          <View style={{ width: 70 }} />
        </View>

        {loading ? (
          <View style={styles.reviewsCenter}>
            <ActivityIndicator size="large" color={colors.violet} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.statsList} showsVerticalScrollIndicator={false}>
            {stats.map(s => (
              <View key={s.label} style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: s.color + '20' }]}>
                  <Ionicons name={s.icon} size={26} color={s.color} />
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </ModalSafeView>
    </Modal>
  );
}

// ── Change Password Modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ visible, onClose }) {
  const { changePassword, isLoading, errorMessage, clearError } = useAuth();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');

  function reset() { setCurrent(''); setNewPwd(''); setConfirm(''); clearError(); }

  async function handleSave() {
    const ok = await changePassword(current, newPwd, confirm);
    if (ok) { reset(); onClose(); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ModalSafeView>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Text style={styles.modalCancel}>Odustani</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Promeni lozinku</Text>
            <View style={{ width: 70 }} />
          </View>

          <View style={styles.modalBody}>
            <InputField icon="lock-closed-outline" placeholder="Trenutna lozinka" value={current} onChangeText={v => { setCurrent(v); clearError(); }} isSecure accentColor={colors.violet} />
            <View style={{ height: 12 }} />
            <InputField icon="lock-open-outline" placeholder="Nova lozinka (min. 6 karaktera)" value={newPwd} onChangeText={v => { setNewPwd(v); clearError(); }} isSecure accentColor={colors.violet} />
            <View style={{ height: 12 }} />
            <InputField icon="lock-open" placeholder="Potvrdi novu lozinku" value={confirm} onChangeText={v => { setConfirm(v); clearError(); }} isSecure accentColor={colors.violet} />

            {errorMessage ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={15} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={{ marginTop: 20 }} onPress={handleSave} disabled={isLoading} activeOpacity={0.85}>
              <LinearGradient colors={[colors.violet, colors.sky]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                {isLoading
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.saveBtnText}>Sačuvaj</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ModalSafeView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  selector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  selectorTab: { flex: 1, alignItems: 'center' },
  selectorTabInner: {
    width: TAB_WIDTH,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorLabel: { fontSize: 14, color: colors.muted },
  selectorLabelActive: { fontSize: 14, color: colors.violet, fontWeight: '600' },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: TAB_WIDTH,
    height: 2,
    backgroundColor: colors.violet,
    borderRadius: 1,
  },

  // Library / Wishlist empty
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingBottom: 60 },
  emptyIconBg: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: colors.mint + '14', justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textDark },
  emptySubtitle: { fontSize: 14, color: colors.muted, textAlign: 'center' },

  // Wishlist folders
  wlHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  newFolderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.violet + '14',
    borderRadius: 20, borderWidth: 1, borderColor: colors.violet + '30',
    marginTop: 16,
  },
  newFolderBtnText: { fontSize: 13, fontWeight: '600', color: colors.violet },
  folderHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 10,
    marginTop: 8,
  },
  folderHeaderName: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  folderCount: {
    fontSize: 11, fontWeight: '600', color: colors.violet,
    backgroundColor: colors.violet + '1A', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  emptyFolder: { paddingHorizontal: 20, paddingBottom: 8 },
  emptyFolderText: { fontSize: 13, color: colors.muted },

  // Bottom sheet (move modal)
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0D0E0', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, marginBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder },
  sheetRowText: { fontSize: 15, color: colors.textDark, flex: 1 },

  // Folder name modal (create / rename)
  nameModalCard: {
    margin: 32, backgroundColor: colors.white, borderRadius: 20,
    padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20,
  },
  nameModalTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark, marginBottom: 16 },
  nameModalInput: {
    borderWidth: 1.5, borderColor: colors.violet + '50', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: colors.textDark, backgroundColor: colors.inputBg,
  },
  nameModalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  nameModalCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F0EFF8', alignItems: 'center' },
  nameModalCancelText: { fontSize: 14, fontWeight: '600', color: colors.muted2 },
  nameModalSave: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.violet, alignItems: 'center' },
  nameModalSaveText: { fontSize: 14, fontWeight: '700', color: colors.white },

  // Folder cards
  folderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8,
  },
  folderCardIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.violet + '14', justifyContent: 'center', alignItems: 'center',
  },
  folderLockBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.violet,
    justifyContent: 'center', alignItems: 'center',
  },
  folderCardName: { fontSize: 15, fontWeight: '600', color: colors.textDark },
  folderCardSub: { fontSize: 13, color: colors.muted, marginTop: 2 },

  // Folder detail header
  folderDetailNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder,
  },
  folderDetailBack: { padding: 8 },
  folderDetailTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  folderDetailMenu: { padding: 8 },

  // Section label
  wlSectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.muted,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    letterSpacing: 0.5,
  },

  // Wishlist
  wishlistRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, backgroundColor: colors.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8,
  },
  wishlistCover: {
    width: 72, height: 100, borderRadius: 10,
    backgroundColor: '#EEEEf8', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  wishlistInfo: { flex: 1, gap: 5 },
  wishlistTitle: { fontSize: 15, fontWeight: '600', color: colors.textDark },
  wishlistAuthor: { fontSize: 13, color: colors.muted2 },
  wishlistPrice: { fontSize: 15, fontWeight: '700', color: colors.violet },
  libraryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  libraryBadgeText: { fontSize: 11, fontWeight: '600', color: colors.mint },
  privacyHint: { fontSize: 11, color: colors.muted, marginTop: 1 },

  // Profile page
  profileScroll: { padding: 20, paddingTop: 20, gap: 20 },
  avatarCard: {
    alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 20, paddingVertical: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10,
  },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 34, fontWeight: '700', color: colors.white },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  avatarName: { fontSize: 20, fontWeight: '700', color: colors.textDark },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  nameInput: {
    fontSize: 18, fontWeight: '600', color: colors.textDark,
    borderBottomWidth: 1.5, borderBottomColor: colors.violet,
    paddingVertical: 2, paddingHorizontal: 4, minWidth: 120, textAlign: 'center',
  },
  nameActionBtn: { padding: 6 },
  nameError: { fontSize: 12, color: colors.error, marginTop: 2, marginBottom: 2 },
  avatarEmail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  avatarSince: { fontSize: 13, color: colors.muted, marginTop: 2 },

  // Sections
  section: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: colors.muted, paddingHorizontal: 4 },
  sectionCard: {
    backgroundColor: colors.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8,
    overflow: 'hidden',
  },
  rowContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  iconBox: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.textDark, flex: 1 },
  rowValue: { fontSize: 13, color: colors.muted2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.cardBorder, marginLeft: 52 },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, backgroundColor: '#FEF2F2', borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.error + '33',
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: colors.error },

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
  modalBody: { padding: 24 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  errorText: { fontSize: 13, color: colors.error, flex: 1 },
  saveBtn: { height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },

  // My reviews modal
  reviewsCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  reviewsEmpty: { fontSize: 17, fontWeight: '600', color: colors.textDark },
  reviewsEmptySub: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  reviewsList: { padding: 16, gap: 12 },
  reviewCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    padding: 14, backgroundColor: colors.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
  },
  reviewCover: {
    width: 52, height: 74, borderRadius: 8,
    backgroundColor: '#EEEEf8', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  reviewBookTitle: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  reviewBookAuthor: { fontSize: 12, color: colors.muted2 },
  reviewComment: { fontSize: 13, color: '#4A4A6A', lineHeight: 18, marginTop: 2 },

  // Stats modal
  statsList: { padding: 16, gap: 12 },
  statCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, backgroundColor: colors.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
  },
  statIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  statLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.textDark },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.textDark },

  // Friends
  friendsSubHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
  },
  friendsSubLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, letterSpacing: 0.5 },
  requestBadge: {
    backgroundColor: colors.error, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  requestBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  friendsCount: { fontSize: 12, fontWeight: '600', color: colors.muted },
  friendRequestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  friendName: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textDark },
  acceptBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.mint, justifyContent: 'center', alignItems: 'center',
  },
  declineBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#EBEBF5', justifyContent: 'center', alignItems: 'center',
  },
  noFriendsRow: { paddingHorizontal: 16, paddingVertical: 12 },
  noFriendsText: { fontSize: 13, color: colors.muted },
});
