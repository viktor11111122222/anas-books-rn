import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function BookCard({ book, onPress }) {
  const { wishlistIds, toggleWishlist } = useAuth();
  const isInWishlist = wishlistIds.has(book.id);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      {/* Cover */}
      <View style={styles.coverContainer}>
        {book.cover_url ? (
          <Image
            source={{ uri: book.cover_url }}
            style={styles.cover}
            contentFit="fill"
            placeholder={BLURHASH}
            transition={200}
            cachePolicy="disk"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="book" size={32} color={colors.muted} />
          </View>
        )}

        {/* Wishlist heart */}
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => toggleWishlist(book.id, {
            title: book.title, author: book.author,
            coverUrl: book.cover_url, minPrice: book.min_price,
            storeCount: book.store_count,
          })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.heartCircle, isInWishlist && styles.heartCircleActive]}>
            <Ionicons
              name={isInWishlist ? 'heart' : 'heart-outline'}
              size={isInWishlist ? 15 : 12}
              color={isInWishlist ? colors.heartRed : 'rgba(255,255,255,0.75)'}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{book.author}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>from {book.min_price} RSD</Text>
          {book.store_count > 1 && (
            <View style={styles.storeBadge}>
              <Text style={styles.storeCount}>{book.store_count} stores</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  coverContainer: {
    height: 160,
    backgroundColor: '#EEEEf8',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBtn: {
    position: 'absolute',
    top: 7,
    right: 7,
  },
  heartCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartCircleActive: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  info: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 3,
  },
  author: {
    fontSize: 11,
    color: colors.muted2,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.violet,
  },
  storeBadge: {
    backgroundColor: colors.mint,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  storeCount: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
});
