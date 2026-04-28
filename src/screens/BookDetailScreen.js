import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useBooks } from '../hooks/useBooks';
import { colors } from '../utils/colors';

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

const ANGLES = [0, 60, 120, 180, 240, 300].map(d => (d * Math.PI) / 180);
const DIST = 26;

function WishlistButton({ isActive, onPress }) {
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
  const { fetchDetail } = useBooks();
  const { wishlistIds, toggleWishlist, libraryIds, toggleLibrary } = useAuth();

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isInWishlist = wishlistIds.has(bookId);
  const isInLibrary  = libraryIds.has(bookId);

  useEffect(() => {
    fetchDetail(bookId)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [bookId]);

  const sorted = detail ? [...detail.listings].sort((a, b) => a.price - b.price) : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <WishlistButton
          isActive={isInWishlist}
          onPress={() => detail && toggleWishlist(bookId, {
            title: detail.title, author: detail.author,
            coverUrl: detail.cover_url,
            minPrice: detail.listings.length ? Math.min(...detail.listings.map(l => l.price)) : undefined,
            storeCount: detail.listings.length,
          })}
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

          <View style={{ height: 40 + insets.bottom }} />
        </ScrollView>
      )}
    </View>
  );
}

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
});
