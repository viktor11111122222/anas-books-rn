import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Dimensions, FlatList, Modal, Image,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { InputField } from '../components/InputField';
import { colors } from '../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGES = ['Biblioteka', 'Profil', 'Wishlist'];
const AVATAR_KEY = 'avatar_uri';

// ── Profile page container ────────────────────────────────────────────────────

export function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const scrollRef = useRef(null);

  function goToPage(i) {
    setPage(i);
    scrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
  }

  function onScroll(e) {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / SCREEN_WIDTH);
    if (i !== page) setPage(i);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Page selector */}
      <View style={styles.selector}>
        {PAGES.map((label, i) => (
          <TouchableOpacity key={label} style={styles.selectorTab} onPress={() => goToPage(i)}>
            <Text style={[styles.selectorLabel, page === i && styles.selectorLabelActive]}>{label}</Text>
            <View style={[styles.selectorLine, page === i && styles.selectorLineActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        contentOffset={{ x: SCREEN_WIDTH, y: 0 }}
      >
        <View style={{ width: SCREEN_WIDTH }}>
          <LibraryPage navigation={navigation} />
        </View>
        <View style={{ width: SCREEN_WIDTH }}>
          <ProfilePage navigation={navigation} />
        </View>
        <View style={{ width: SCREEN_WIDTH }}>
          <WishlistPage navigation={navigation} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Library page ──────────────────────────────────────────────────────────────

function LibraryPage({ navigation }) {
  const { libraryBooks, toggleLibrary, syncLibrary } = useAuth();

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
          <TouchableOpacity onPress={() => toggleLibrary(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle-outline" size={22} color={colors.muted} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
  );
}

// ── Wishlist page ─────────────────────────────────────────────────────────────

function WishlistPage({ navigation }) {
  const { wishlistBooks, toggleWishlist, syncWishlist } = useAuth();

  useEffect(() => { syncWishlist(); }, []);

  if (wishlistBooks.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={[styles.emptyIconBg, { backgroundColor: colors.violet + '14' }]}>
          <Ionicons name="heart" size={36} color={colors.violet + '59'} />
        </View>
        <Text style={styles.emptyTitle}>Wishlist je prazan</Text>
        <Text style={styles.emptySubtitle}>Pritisni srce na knjizi{'\n'}da je dodaš ovde</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={wishlistBooks}
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
                contentFit="fill"
                cachePolicy="disk"
              />
            ) : (
              <Ionicons name="book" size={24} color={colors.muted} />
            )}
          </View>
          <View style={styles.wishlistInfo}>
            <Text style={styles.wishlistTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.wishlistAuthor} numberOfLines={1}>{item.author}</Text>
            {item.min_price != null && (
              <Text style={styles.wishlistPrice}>{item.min_price} RSD</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => toggleWishlist(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="heart" size={22} color={colors.heartRed} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
  );
}

// ── Profile page ──────────────────────────────────────────────────────────────

function ProfilePage({ navigation }) {
  const { userSession, profile, fetchMe, signOut, updateDisplayName, isLoading, errorMessage, clearError } = useAuth();
  const [avatarUri, setAvatarUri] = useState(null);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    fetchMe();
    AsyncStorage.getItem(AVATAR_KEY).then(uri => { if (uri) setAvatarUri(uri); });
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
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      AsyncStorage.setItem(AVATAR_KEY, uri);
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
          <TouchableOpacity style={styles.avatarWrapper} onPress={pickAvatar} activeOpacity={0.85}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={[colors.violet, colors.sky]} style={styles.avatar}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </LinearGradient>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color={colors.violet} />
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
              onValueChange={v => {
                setNotificationsOn(v);
                AsyncStorage.setItem('pref_notifications', String(v));
              }}
              trackColor={{ false: '#D0D0D8', true: colors.mint }}
              thumbColor={colors.white}
            />
          </View>
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
    </>
  );
}

// ── Profile helpers ───────────────────────────────────────────────────────────

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
        <View style={styles.modalRoot}>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  selector: {
    flexDirection: 'row', backgroundColor: colors.background,
  },
  selectorTab: { flex: 1, alignItems: 'center' },
  selectorLabel: { fontSize: 14, color: colors.muted, paddingVertical: 12 },
  selectorLabelActive: { color: colors.violet, fontWeight: '600' },
  selectorLine: { height: 2, width: '100%', backgroundColor: 'transparent', borderRadius: 1 },
  selectorLineActive: { backgroundColor: colors.violet },

  // Library / Wishlist empty
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingBottom: 60 },
  emptyIconBg: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: colors.mint + '14', justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textDark },
  emptySubtitle: { fontSize: 14, color: colors.muted, textAlign: 'center' },

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
});
