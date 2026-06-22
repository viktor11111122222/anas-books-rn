import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking, Modal, TextInput,
  FlatList, KeyboardAvoidingView, Platform, Alert,
  Animated as RNAnimated, PanResponder, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useBooks } from '../hooks/useBooks';
import { colors } from '../utils/colors';
import { BASE_URL } from '../utils/api';

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
const ANGLES = [0, 60, 120, 180, 240, 300].map(d => (d * Math.PI) / 180);
const DIST = 26;

function StarRow({ rating, size = 16, color = colors.gold }) {
  if (!rating) return null;
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: full  }).map((_, i) => <Ionicons key={`f${i}`} name="star"         size={size} color={color} />)}
      {half === 1 && <Ionicons name="star-half"    size={size} color={color} />}
      {Array.from({ length: empty }).map((_, i) => <Ionicons key={`e${i}`} name="star-outline" size={size} color={color} />)}
    </View>
  );
}

function AvatarView({ uri, initial, size = 40 }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [uri]);
  const s = { width: size, height: size, borderRadius: size / 2 };
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[s, { overflow: 'hidden' }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <LinearGradient colors={[colors.violet, colors.sky]} style={[s, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>{initial}</Text>
    </LinearGradient>
  );
}

const AnimatedSheet = RNAnimated.createAnimatedComponent(TouchableOpacity);

const WINDOW_HEIGHT = Dimensions.get('window').height;

function DraggableSheet({ visible, onClose, title, bottomPad = 0, children }) {
  const translateY      = useRef(new RNAnimated.Value(WINDOW_HEIGHT)).current;
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;

  // Keep onClose stable inside the ref so panResponder closure never goes stale
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Stable dismiss function — safe to call from panResponder
  const dismiss = useRef(() => {
    RNAnimated.parallel([
      RNAnimated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      RNAnimated.timing(translateY,      { toValue: WINDOW_HEIGHT, duration: 250, useNativeDriver: true }),
    ]).start(() => onCloseRef.current());
  }).current;

  useEffect(() => {
    if (visible) {
      // Reset then animate in: backdrop fades, sheet slides up from below
      translateY.setValue(WINDOW_HEIGHT);
      backdropOpacity.setValue(0);
      RNAnimated.parallel([
        RNAnimated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.spring(translateY, { toValue: 0, tension: 68, friction: 12, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy, dx }) => dy > 5 && dy > Math.abs(dx),
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 0.6) {
          dismiss();
        } else {
          RNAnimated.spring(translateY, { toValue: 0, tension: 80, friction: 13, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      {/* Backdrop — fades in independently, never slides */}
      <RNAnimated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', opacity: backdropOpacity }]}
        pointerEvents="none"
      />
      {/* Tap dark area to dismiss */}
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={dismiss} activeOpacity={1} />
      {/* Sheet — slides up from below */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <AnimatedSheet
          style={[fpStyles.sheet, { maxHeight: WINDOW_HEIGHT * 0.82, paddingBottom: bottomPad, transform: [{ translateY }] }]}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View {...panResponder.panHandlers} style={fpStyles.sheetHeader}>
            <View style={fpStyles.handle} />
            <View style={fpStyles.sheetTitleRow}>
              <Text style={fpStyles.title}>{title}</Text>
              <TouchableOpacity style={fpStyles.closeBtn} onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color={colors.textDark} />
              </TouchableOpacity>
            </View>
          </View>
          {children}
        </AnimatedSheet>
      </View>
    </Modal>
  );
}

function WriteReviewSheet({ visible, onClose, title, bottomPad = 0, disabled = false, children }) {
  const translateY      = useRef(new RNAnimated.Value(WINDOW_HEIGHT)).current;
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;

  const onCloseRef  = useRef(onClose);  onCloseRef.current  = onClose;
  const disabledRef = useRef(disabled); disabledRef.current = disabled;

  const dismiss = useRef(() => {
    if (disabledRef.current) return;
    RNAnimated.parallel([
      RNAnimated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      RNAnimated.timing(translateY,      { toValue: WINDOW_HEIGHT, duration: 250, useNativeDriver: true }),
    ]).start(() => onCloseRef.current());
  }).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(WINDOW_HEIGHT);
      backdropOpacity.setValue(0);
      RNAnimated.parallel([
        RNAnimated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.spring(translateY, { toValue: 0, tension: 68, friction: 12, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <RNAnimated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', opacity: backdropOpacity }]}
        pointerEvents="none"
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1 }} onPress={dismiss} activeOpacity={1} />
        <AnimatedSheet
          style={[fpStyles.sheet, { paddingBottom: bottomPad, transform: [{ translateY }] }]}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={fpStyles.sheetHeader}>
            <View style={fpStyles.handle} />
            <View style={fpStyles.sheetTitleRow}>
              <Text style={fpStyles.title}>{title}</Text>
              <TouchableOpacity
                style={fpStyles.closeBtn}
                onPress={dismiss}
                disabled={disabled}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={disabled ? colors.muted : colors.textDark} />
              </TouchableOpacity>
            </View>
          </View>
          {children}
        </AnimatedSheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function WishlistButton({ isActive, onPress, requiresFolderPick }) {
  const scale     = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOp    = useSharedValue(0);

  const p0x = useSharedValue(0); const p0y = useSharedValue(0); const p0o = useSharedValue(0); const p0s = useSharedValue(0);
  const p1x = useSharedValue(0); const p1y = useSharedValue(0); const p1o = useSharedValue(0); const p1s = useSharedValue(0);
  const p2x = useSharedValue(0); const p2y = useSharedValue(0); const p2o = useSharedValue(0); const p2s = useSharedValue(0);
  const p3x = useSharedValue(0); const p3y = useSharedValue(0); const p3o = useSharedValue(0); const p3s = useSharedValue(0);
  const p4x = useSharedValue(0); const p4y = useSharedValue(0); const p4o = useSharedValue(0); const p4s = useSharedValue(0);
  const p5x = useSharedValue(0); const p5y = useSharedValue(0); const p5o = useSharedValue(0); const p5s = useSharedValue(0);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle  = useAnimatedStyle(() => ({ transform: [{ scale: ringScale.value }], opacity: ringOp.value }));
  const ps0 = useAnimatedStyle(() => ({ opacity: p0o.value, transform: [{ translateX: p0x.value }, { translateY: p0y.value }, { scale: p0s.value }] }));
  const ps1 = useAnimatedStyle(() => ({ opacity: p1o.value, transform: [{ translateX: p1x.value }, { translateY: p1y.value }, { scale: p1s.value }] }));
  const ps2 = useAnimatedStyle(() => ({ opacity: p2o.value, transform: [{ translateX: p2x.value }, { translateY: p2y.value }, { scale: p2s.value }] }));
  const ps3 = useAnimatedStyle(() => ({ opacity: p3o.value, transform: [{ translateX: p3x.value }, { translateY: p3y.value }, { scale: p3s.value }] }));
  const ps4 = useAnimatedStyle(() => ({ opacity: p4o.value, transform: [{ translateX: p4x.value }, { translateY: p4y.value }, { scale: p4s.value }] }));
  const ps5 = useAnimatedStyle(() => ({ opacity: p5o.value, transform: [{ translateX: p5x.value }, { translateY: p5y.value }, { scale: p5s.value }] }));
  const particleStyles = [ps0, ps1, ps2, ps3, ps4, ps5];

  function handlePress() {
    if (requiresFolderPick) { onPress(); return; }
    if (!isActive) {
      scale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withTiming(1.0, { duration: 200 }),
      );
      ringScale.value = 1;
      ringOp.value = withSequence(
        withTiming(0.75, { duration: 40 }),
        withDelay(80, withTiming(0, { duration: 300 })),
      );
      ringScale.value = withTiming(2.0, { duration: 380 });

      const allP = [
        [p0x, p0y, p0o, p0s], [p1x, p1y, p1o, p1s], [p2x, p2y, p2o, p2s],
        [p3x, p3y, p3o, p3s], [p4x, p4y, p4o, p4s], [p5x, p5y, p5o, p5s],
      ];
      allP.forEach(([px, py, po, ps], i) => {
        const tx = Math.cos(ANGLES[i]) * DIST;
        const ty = Math.sin(ANGLES[i]) * DIST;
        px.value = 0; py.value = 0; ps.value = 0; po.value = 0;
        px.value = withTiming(tx, { duration: 340 });
        py.value = withTiming(ty, { duration: 340 });
        ps.value = withSequence(
          withTiming(1, { duration: 100 }),
          withDelay(100, withTiming(0, { duration: 180 })),
        );
        po.value = withSequence(
          withTiming(1, { duration: 40 }),
          withDelay(140, withTiming(0, { duration: 160 })),
        );
      });
    } else {
      scale.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(1.0, { duration: 150 }),
      );
    }
    onPress();
  }

  return (
    <TouchableOpacity style={wStyles.btn} onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[wStyles.ring, ringStyle]} pointerEvents="none" />
      {particleStyles.map((st, i) => (
        <Animated.View key={i} style={[wStyles.particle, st]} pointerEvents="none" />
      ))}
      <Animated.View style={heartStyle}>
        <Ionicons
          name={isActive ? 'heart' : 'heart-outline'}
          size={22}
          color={isActive ? colors.heartRed : colors.muted}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const wStyles = StyleSheet.create({
  btn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  ring: {
    position: 'absolute',
    width: 38, height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.heartRed,
  },
  particle: {
    position: 'absolute',
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: colors.heartRed,
  },
});

export function BookDetailScreen({ route, navigation }) {
  const { bookId } = route.params;
  const insets = useSafeAreaInsets();
  const { fetchDetail, fetchSimilar, fetchByAuthor } = useBooks();
  const {
    userSession,
    wishlistIds, wishlistFolders, toggleWishlist, createWishlistFolder,
    libraryIds, toggleLibrary,
  } = useAuth();

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [similarBooks, setSimilarBooks] = useState([]);
  const [authorBooks, setAuthorBooks] = useState([]);
  const [folderPicker, setFolderPicker] = useState(false);
  const [newFolderInput, setNewFolderInput] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const isInWishlist = wishlistIds.has(bookId);
  const isInLibrary  = libraryIds.has(bookId);
  const myReview     = reviews.find(r => r.user?.id === userSession?.id) ?? null;

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/reviews/${bookId}`);
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch {} finally { setReviewsLoading(false); }
  };

  const refreshReviewsAndStats = async () => {
    const fresh = await fetch(`${BASE_URL}/reviews/${bookId}`).then(r => r.json()).catch(() => []);
    const list = Array.isArray(fresh) ? fresh : [];
    setReviews(list);
    const avg = list.length > 0 ? list.reduce((s, r) => s + r.rating, 0) / list.length : null;
    setDetail(prev => prev ? {
      ...prev,
      review_count: list.length,
      avg_rating: avg != null ? Math.round(avg * 10) / 10 : null,
    } : prev);
  };

  const submitReview = async () => {
    if (!draftRating) return;
    setReviewSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) { Alert.alert('Greška', 'Nisi prijavljen.'); return; }
      const res = await fetch(`${BASE_URL}/reviews/${bookId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: draftRating, comment: draftComment.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowWriteReview(false);
        await refreshReviewsAndStats();
      } else {
        Alert.alert('Greška', data.message || `Server error ${res.status}`);
      }
    } catch (e) {
      Alert.alert('Greška', 'Nije uspelo slanje recenzije. Proveri internet vezu.');
    } finally { setReviewSubmitting(false); }
  };

  const deleteReview = async () => {
    setReviewSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) { Alert.alert('Greška', 'Nisi prijavljen.'); return; }
      const res = await fetch(`${BASE_URL}/reviews/${bookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setShowWriteReview(false);
        await refreshReviewsAndStats();
      } else {
        const data = await res.json().catch(() => ({}));
        Alert.alert('Greška', data.message || `Server error ${res.status}`);
      }
    } catch (e) {
      Alert.alert('Greška', 'Nije uspelo brisanje recenzije.');
    } finally { setReviewSubmitting(false); }
  };

  useEffect(() => {
    let cancelled = false;
    setSimilarBooks([]);
    setAuthorBooks([]);
    setReviews([]);
    SecureStore.getItemAsync('auth_token').then(token => {
      if (token) {
        fetch(`${BASE_URL}/books/${bookId}/view`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }).catch(() => {});

    fetchDetail(bookId)
      .then(data => {
        if (cancelled) return;
        setDetail(data);
        fetchSimilar(bookId).then(d => { if (!cancelled) setSimilarBooks(d); });
        fetchByAuthor(bookId).then(d => { if (!cancelled) setAuthorBooks(d); });
        AsyncStorage.getItem('recently_viewed').then(val => {
          const prev = val ? JSON.parse(val) : [];
          const entry = { id: data.id, title: data.title, author: data.author, cover_url: data.cover_url ?? null };
          const updated = [entry, ...prev.filter(b => b.id !== data.id)].slice(0, 30);
          AsyncStorage.setItem('recently_viewed', JSON.stringify(updated));
        }).catch(() => {});
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    loadReviews();
    return () => { cancelled = true; };
  }, [bookId]);

  const sorted = detail?.listings?.length ? [...detail.listings].sort((a, b) => a.price - b.price) : [];
  const visibleSimilar = similarBooks.filter(b => !libraryIds.has(b.id));
  const visibleAuthor  = authorBooks.filter(b => !libraryIds.has(b.id));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <WishlistButton
          isActive={isInWishlist}
          requiresFolderPick={!isInWishlist}
          onPress={() => {
            if (!detail) return;
            if (!isInWishlist) {
              setShowNewFolderInput(false);
              setNewFolderInput('');
              setFolderPicker(true);
            } else {
              toggleWishlist(bookId, {
                title: detail.title, author: detail.author,
                coverUrl: detail.cover_url,
                minPrice: detail.listings.length ? Math.min(...detail.listings.map(l => l.price)) : undefined,
                storeCount: detail.listings.length,
              });
            }
          }}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.violet} /></View>
      ) : !detail ? (
        <View style={styles.center}><Text style={styles.errorText}>Could not load book.</Text></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Cover area */}
          <LinearGradient
            colors={[colors.violet + '26', colors.sky + '1A']}
            style={styles.coverBg}
          >
            {detail.cover_url ? (
              <Image
                source={{ uri: detail.cover_url }}
                style={styles.cover}
                contentFit="contain"
                placeholder={BLURHASH}
                transition={200}
                cachePolicy="disk"
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="book" size={60} color={colors.muted} />
              </View>
            )}
          </LinearGradient>

          {/* Info */}
          <View style={styles.infoSection}>
            <Text style={styles.title}>{detail.title}</Text>
            <TouchableOpacity
              style={styles.authorRow}
              onPress={() => navigation.navigate('AuthorBooks', { author: detail.author })}
            >
              <Ionicons name="person" size={11} color={colors.violet} />
              <Text style={styles.author}>{detail.author}</Text>
            </TouchableOpacity>
            {detail.isbn ? (
              <Text style={styles.isbn}>ISBN: {detail.isbn}</Text>
            ) : null}
            {detail.description ? (
              <Text style={styles.description}>{detail.description}</Text>
            ) : null}
          </View>

          {/* Library button */}
          <TouchableOpacity
            style={[styles.libraryBtn, isInLibrary && styles.libraryBtnActive]}
            onPress={() => detail && toggleLibrary(bookId, {
              title: detail.title, author: detail.author,
              coverUrl: detail.cover_url, minPrice: detail.listings.length ? Math.min(...detail.listings.map(l => l.price)) : undefined,
            })}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isInLibrary ? 'checkmark-circle' : 'library'}
              size={18}
              color={isInLibrary ? colors.mint : colors.violet}
            />
            <Text style={[styles.libraryBtnText, isInLibrary && styles.libraryBtnTextActive]}>
              {isInLibrary ? 'U biblioteci — ukloni' : 'Dodaj u biblioteku'}
            </Text>
          </TouchableOpacity>

          {/* Rating summary */}
          {detail.review_count > 0 && (
            <View style={styles.ratingRow}>
              <StarRow rating={detail.avg_rating} size={17} />
              <Text style={styles.ratingAvg}>{detail.avg_rating}</Text>
              <Text style={styles.ratingCount}>· {detail.review_count} {detail.review_count === 1 ? 'recenzija' : 'recenzija'}</Text>
            </View>
          )}

          {/* Review action buttons */}
          {(detail.review_count > 0 || (isInLibrary && userSession)) && (
            <View style={styles.reviewBtnsRow}>
              {detail.review_count > 0 && (
                <TouchableOpacity
                  style={styles.reviewBtn}
                  onPress={() => { setShowReviews(true); }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubbles-outline" size={15} color={colors.violet} />
                  <Text style={styles.reviewBtnText}>Recenzije ({detail.review_count})</Text>
                </TouchableOpacity>
              )}
              {isInLibrary && userSession && (
                <TouchableOpacity
                  style={[styles.reviewBtn, myReview && styles.reviewBtnFilled]}
                  onPress={() => {
                    setDraftRating(myReview?.rating ?? 0);
                    setDraftComment(myReview?.comment ?? '');
                    setShowWriteReview(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={myReview ? 'pencil' : 'pencil-outline'}
                    size={15}
                    color={myReview ? colors.white : colors.violet}
                  />
                  <Text style={[styles.reviewBtnText, myReview && styles.reviewBtnTextFilled]}>
                    {myReview ? 'Moja recenzija' : 'Napiši recenziju'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Listings */}
          <View style={styles.listingsSection}>
            <Text style={styles.listingsTitle}>Cene u prodavnicama</Text>
            {sorted.map((listing, idx) => (
              <ListingRow
                key={listing.store}
                listing={listing}
                isCheapest={idx === 0 && sorted.length > 1}
              />
            ))}
          </View>

          {/* Similar books */}
          {visibleSimilar.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={styles.similarTitle}>Slične knjige</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarScroll}
              >
                {visibleSimilar.map(book => (
                  <TouchableOpacity
                    key={book.id}
                    style={styles.similarCard}
                    onPress={() => navigation.push('BookDetail', { bookId: book.id })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.similarCover}>
                      {book.cover_url ? (
                        <Image
                          source={{ uri: book.cover_url }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          cachePolicy="disk"
                        />
                      ) : (
                        <Ionicons name="book" size={28} color={colors.muted} />
                      )}
                    </View>
                    <Text style={styles.similarBookTitle} numberOfLines={2}>{book.title}</Text>
                    {book.min_price != null && <Text style={styles.similarBookPrice}>{book.min_price} RSD</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Author books */}
          {visibleAuthor.length > 0 && detail && (
            <View style={styles.similarSection}>
              <Text style={styles.similarTitle}>Više od {detail.author}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.similarScroll}
              >
                {visibleAuthor.map(book => (
                  <TouchableOpacity
                    key={book.id}
                    style={styles.similarCard}
                    onPress={() => navigation.push('BookDetail', { bookId: book.id })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.similarCover}>
                      {book.cover_url ? (
                        <Image
                          source={{ uri: book.cover_url }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          cachePolicy="disk"
                        />
                      ) : (
                        <Ionicons name="book" size={28} color={colors.muted} />
                      )}
                    </View>
                    <Text style={styles.similarBookTitle} numberOfLines={2}>{book.title}</Text>
                    {book.min_price != null && <Text style={styles.similarBookPrice}>{book.min_price} RSD</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 40 + insets.bottom }} />
        </ScrollView>
      )}

      {/* Reviews list modal */}
      <DraggableSheet
        visible={showReviews}
        onClose={() => setShowReviews(false)}
        title="Recenzije"
        bottomPad={30 + insets.bottom}
      >
        {reviewsLoading ? (
          <ActivityIndicator size="small" color={colors.violet} style={{ marginVertical: 24 }} />
        ) : reviews.length === 0 ? (
          <Text style={rvStyles.emptyText}>Nema recenzija.</Text>
        ) : (
          <FlatList
            data={reviews}
            keyExtractor={r => String(r.id)}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={rvStyles.separator} />}
            renderItem={({ item: r }) => (
              <View style={rvStyles.reviewRow}>
                <AvatarView
                  uri={r.user.avatar_url}
                  initial={(r.user.display_name?.[0] ?? '?').toUpperCase()}
                  size={40}
                />
                <View style={{ flex: 1 }}>
                  <View style={rvStyles.reviewHeader}>
                    <Text style={rvStyles.reviewName}>{r.user.display_name}</Text>
                    <StarRow rating={r.rating} size={13} />
                  </View>
                  {r.comment ? <Text style={rvStyles.reviewComment}>{r.comment}</Text> : null}
                </View>
              </View>
            )}
          />
        )}
      </DraggableSheet>

      {/* Write / edit review modal */}
      <WriteReviewSheet
        visible={showWriteReview}
        onClose={() => setShowWriteReview(false)}
        title={myReview ? 'Promeni recenziju' : 'Napiši recenziju'}
        bottomPad={30 + insets.bottom}
        disabled={reviewSubmitting}
      >
        <View style={rvStyles.starPicker}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity
              key={n}
              onPress={() => setDraftRating(n)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons
                name={n <= draftRating ? 'star' : 'star-outline'}
                size={38}
                color={n <= draftRating ? colors.gold : colors.muted}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={rvStyles.commentInput}
          value={draftComment}
          onChangeText={setDraftComment}
          placeholder="Napiši komentar (opcionalno)..."
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[rvStyles.submitBtn, (!draftRating || reviewSubmitting) && { opacity: 0.5 }]}
          onPress={submitReview}
          disabled={!draftRating || reviewSubmitting}
          activeOpacity={0.85}
        >
          {reviewSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={rvStyles.submitBtnText}>Sačuvaj recenziju</Text>
          )}
        </TouchableOpacity>

        {myReview && (
          <TouchableOpacity
            style={rvStyles.deleteBtn}
            onPress={deleteReview}
            disabled={reviewSubmitting}
            activeOpacity={0.85}
          >
            <Text style={rvStyles.deleteBtnText}>Obriši recenziju</Text>
          </TouchableOpacity>
        )}
      </WriteReviewSheet>

      {/* Folder picker */}
      <Modal visible={folderPicker} transparent animationType="slide" onRequestClose={() => setFolderPicker(false)}>
        <TouchableOpacity style={fpStyles.overlay} activeOpacity={1} onPress={() => setFolderPicker(false)}>
          <View style={fpStyles.sheet}>
            <View style={fpStyles.handle} />
            <Text style={fpStyles.title}>Dodaj u wishlist</Text>

            {wishlistFolders.map(f => (
              <TouchableOpacity
                key={f.id}
                style={fpStyles.row}
                onPress={() => {
                  setFolderPicker(false);
                  detail && toggleWishlist(bookId, {
                    title: detail.title, author: detail.author,
                    coverUrl: detail.cover_url,
                    minPrice: detail.listings.length ? Math.min(...detail.listings.map(l => l.price)) : undefined,
                    storeCount: detail.listings.length,
                    folderId: f.id,
                  });
                }}
              >
                <Ionicons name="folder" size={19} color={colors.violet} />
                <Text style={fpStyles.rowText}>{f.name}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={fpStyles.row}
              onPress={() => {
                setFolderPicker(false);
                detail && toggleWishlist(bookId, {
                  title: detail.title, author: detail.author,
                  coverUrl: detail.cover_url,
                  minPrice: detail.listings.length ? Math.min(...detail.listings.map(l => l.price)) : undefined,
                  storeCount: detail.listings.length,
                  folderId: null,
                });
              }}
            >
              <Ionicons name="albums-outline" size={19} color={colors.muted} />
              <Text style={fpStyles.rowText}>Bez foldera</Text>
            </TouchableOpacity>

            {showNewFolderInput ? (
              <View style={fpStyles.newFolderRow}>
                <Ionicons name="folder-open" size={19} color={colors.violet} />
                <TextInput
                  style={fpStyles.newFolderInput}
                  value={newFolderInput}
                  onChangeText={setNewFolderInput}
                  placeholder="Naziv foldera"
                  placeholderTextColor={colors.muted}
                  autoFocus
                  maxLength={40}
                  returnKeyType="done"
                  onSubmitEditing={async () => {
                    const name = newFolderInput.trim();
                    if (!name) return;
                    const folder = await createWishlistFolder(name);
                    setFolderPicker(false);
                    setShowNewFolderInput(false);
                    setNewFolderInput('');
                    detail && toggleWishlist(bookId, {
                      title: detail.title, author: detail.author,
                      coverUrl: detail.cover_url,
                      minPrice: detail.listings.length ? Math.min(...detail.listings.map(l => l.price)) : undefined,
                      storeCount: detail.listings.length,
                      folderId: folder?.id ?? null,
                    });
                  }}
                />
              </View>
            ) : (
              <TouchableOpacity style={fpStyles.row} onPress={() => setShowNewFolderInput(true)}>
                <Ionicons name="add-circle-outline" size={19} color={colors.violet} />
                <Text style={[fpStyles.rowText, { color: colors.violet, fontWeight: '600' }]}>Novi folder</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const fpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0D0E0', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { paddingBottom: 4 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: colors.textDark },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#EBEBF5',
    justifyContent: 'center', alignItems: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEBF5',
  },
  rowText: { fontSize: 15, color: colors.textDark },
  newFolderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEBF5',
  },
  newFolderInput: {
    flex: 1, fontSize: 15, color: colors.textDark,
    borderBottomWidth: 1.5, borderBottomColor: colors.violet,
    paddingVertical: 4,
  },
});

const rvStyles = StyleSheet.create({
  emptyText: { color: colors.muted, textAlign: 'center', marginVertical: 24, fontSize: 14 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#EBEBF5', marginVertical: 4 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewName: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  reviewComment: { fontSize: 13, color: '#4A4A6A', lineHeight: 19, marginTop: 2 },
  starPicker: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 4, marginBottom: 20 },
  commentInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textDark,
    minHeight: 90,
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: colors.violet,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  deleteBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.error + '60',
  },
  deleteBtnText: { color: colors.error, fontWeight: '600', fontSize: 14 },
});

function ListingRow({ listing, isCheapest }) {
  function openURL() {
    Linking.openURL(listing.store_url).catch(() => {});
  }

  if (isCheapest) {
    return (
      <TouchableOpacity style={styles.cheapCard} onPress={openURL} activeOpacity={0.85}>
        <View style={[styles.storeIcon, { backgroundColor: colors.mint + '2E' }]}>
          <Ionicons name="storefront" size={22} color={colors.mint} />
        </View>
        <View style={styles.listingInfo}>
          <Text style={styles.storeLabel}>{listing.store_label}</Text>
          <View style={styles.cheapBadge}>
            <Ionicons name="ribbon" size={9} color={colors.white} />
            <Text style={styles.cheapBadgeText}>NAJJEFTINIJE</Text>
          </View>
          <Text style={[styles.stockText, { color: listing.in_stock === 1 ? colors.mint : colors.muted }]}>
            {listing.in_stock === 1 ? 'Na stanju' : 'Nije na stanju'}
          </Text>
        </View>
        <Text style={[styles.price, { color: colors.mint, fontSize: 19 }]}>{listing.price} RSD</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.mint + 'B3'} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.regularCard} onPress={openURL} activeOpacity={0.85}>
      <View style={[styles.storeIcon, { backgroundColor: '#F0F0FA', width: 44, height: 44, borderRadius: 10 }]}>
        <Ionicons name="storefront" size={18} color={colors.muted} />
      </View>
      <View style={styles.listingInfo}>
        <Text style={styles.storeLabelRegular}>{listing.store_label}</Text>
        <Text style={[styles.stockText, { color: listing.in_stock === 1 ? colors.mint : colors.muted }]}>
          {listing.in_stock === 1 ? 'Na stanju' : 'Nije na stanju'}
        </Text>
      </View>
      <Text style={[styles.price, { color: colors.violet }]}>{listing.price} RSD</Text>
      <Ionicons name="chevron-forward" size={12} color="#C0C0D8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  navBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.background,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.muted, fontSize: 15 },
  coverBg: { height: 300, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 },
  cover: { width: 150, height: 220 },
  coverPlaceholder: { width: 150, height: 220, justifyContent: 'center', alignItems: 'center' },
  infoSection: { paddingHorizontal: 22, paddingTop: 20 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark, marginBottom: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  author: { fontSize: 15, color: colors.violet },
  isbn: { fontSize: 12, color: colors.muted, fontVariant: ['tabular-nums'], marginTop: 4 },
  description: { fontSize: 14, color: '#4A4A6A', lineHeight: 20, marginTop: 12 },
  libraryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 22, marginTop: 20,
    paddingVertical: 13, borderRadius: 14,
    backgroundColor: colors.violet + '12',
    borderWidth: 1.5, borderColor: colors.violet + '30',
  },
  libraryBtnActive: {
    backgroundColor: colors.mint + '12',
    borderColor: colors.mint + '40',
  },
  libraryBtnText: { fontSize: 15, fontWeight: '600', color: colors.violet },
  libraryBtnTextActive: { color: colors.mint },
  ratingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 22, marginTop: 14,
  },
  ratingAvg: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  ratingCount: { fontSize: 13, color: colors.muted },
  reviewBtnsRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 22, marginTop: 12, flexWrap: 'wrap',
  },
  reviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.violet + '12',
    borderWidth: 1.5, borderColor: colors.violet + '30',
  },
  reviewBtnFilled: {
    backgroundColor: colors.violet,
    borderColor: colors.violet,
  },
  reviewBtnText: { fontSize: 13, fontWeight: '600', color: colors.violet },
  reviewBtnTextFilled: { color: colors.white },
  listingsSection: { paddingHorizontal: 22, paddingTop: 24 },
  listingsTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark, marginBottom: 12 },
  cheapCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, marginBottom: 10,
    backgroundColor: colors.mint + '21',
    borderWidth: 1.5, borderColor: colors.mint + '8C',
    shadowColor: colors.mint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12,
  },
  regularCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 16, marginBottom: 10,
    backgroundColor: colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8,
  },
  storeIcon: {
    width: 50, height: 50, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  listingInfo: { flex: 1 },
  storeLabel: { fontSize: 16, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  storeLabelRegular: { fontSize: 15, fontWeight: '600', color: colors.textDark, marginBottom: 2 },
  cheapBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.mint, borderRadius: 5,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 4,
  },
  cheapBadgeText: { fontSize: 9, fontWeight: '700', color: colors.white },
  stockText: { fontSize: 12 },
  price: { fontSize: 16, fontWeight: '700' },
  similarSection: { paddingTop: 28 },
  similarTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark, marginBottom: 14, paddingHorizontal: 22 },
  similarScroll: { paddingHorizontal: 16, gap: 12 },
  similarCard: { width: 120 },
  similarCover: {
    width: 120, height: 166,
    borderRadius: 10,
    backgroundColor: '#E8E8F4',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  similarBookTitle: { fontSize: 12, fontWeight: '600', color: colors.textDark, lineHeight: 16 },
  similarBookPrice: { fontSize: 12, fontWeight: '700', color: colors.violet, marginTop: 3 },
});
