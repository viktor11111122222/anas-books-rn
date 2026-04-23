import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useBooks } from '../hooks/useBooks';
import { colors } from '../utils/colors';

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function BookDetailScreen({ route, navigation }) {
  const { bookId } = route.params;
  const insets = useSafeAreaInsets();
  const { fetchDetail } = useBooks();
  const { wishlistIds, toggleWishlist } = useAuth();

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isInWishlist = wishlistIds.has(bookId);

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
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => detail && toggleWishlist(bookId, {
            title: detail.title, author: detail.author,
            coverUrl: detail.cover_url,
            minPrice: detail.listings.length ? Math.min(...detail.listings.map(l => l.price)) : undefined,
            storeCount: detail.listings.length,
          })}
        >
          <Ionicons
            name={isInWishlist ? 'heart' : 'heart-outline'}
            size={22}
            color={isInWishlist ? colors.heartRed : colors.muted}
          />
        </TouchableOpacity>
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
