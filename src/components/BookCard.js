import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const STORE_LABELS = {
  kreativni_centar: 'Kreativni C.',
  data_status:      'Data Status',
  laguna:           'Laguna',
  vulkan:           'Vulkan',
  publik_praktikum: 'Pub. Praktikum',
  delfi:            'Delfi',
  dexy:             'Dexy',
};
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withSequence, withTiming, withDelay,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
const ANGLES = [0, 60, 120, 180, 240, 300].map(d => (d * Math.PI) / 180);
const DIST = 18;
const PARTICLE_COLORS = [colors.heartRed, '#FF8FAB', colors.heartRed, '#FF5C8A', '#FF8FAB', colors.heartRed];

function HeartButton({ isActive, onPress }) {
  const circleScale = useSharedValue(1);
  const ringScale   = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  const p0x = useSharedValue(0); const p0y = useSharedValue(0); const p0o = useSharedValue(0); const p0s = useSharedValue(0);
  const p1x = useSharedValue(0); const p1y = useSharedValue(0); const p1o = useSharedValue(0); const p1s = useSharedValue(0);
  const p2x = useSharedValue(0); const p2y = useSharedValue(0); const p2o = useSharedValue(0); const p2s = useSharedValue(0);
  const p3x = useSharedValue(0); const p3y = useSharedValue(0); const p3o = useSharedValue(0); const p3s = useSharedValue(0);
  const p4x = useSharedValue(0); const p4y = useSharedValue(0); const p4o = useSharedValue(0); const p4s = useSharedValue(0);
  const p5x = useSharedValue(0); const p5y = useSharedValue(0); const p5o = useSharedValue(0); const p5s = useSharedValue(0);

  const ps0 = useAnimatedStyle(() => ({ backgroundColor: PARTICLE_COLORS[0], opacity: p0o.value, transform: [{ translateX: p0x.value }, { translateY: p0y.value }, { scale: p0s.value }] }));
  const ps1 = useAnimatedStyle(() => ({ backgroundColor: PARTICLE_COLORS[1], opacity: p1o.value, transform: [{ translateX: p1x.value }, { translateY: p1y.value }, { scale: p1s.value }] }));
  const ps2 = useAnimatedStyle(() => ({ backgroundColor: PARTICLE_COLORS[2], opacity: p2o.value, transform: [{ translateX: p2x.value }, { translateY: p2y.value }, { scale: p2s.value }] }));
  const ps3 = useAnimatedStyle(() => ({ backgroundColor: PARTICLE_COLORS[3], opacity: p3o.value, transform: [{ translateX: p3x.value }, { translateY: p3y.value }, { scale: p3s.value }] }));
  const ps4 = useAnimatedStyle(() => ({ backgroundColor: PARTICLE_COLORS[4], opacity: p4o.value, transform: [{ translateX: p4x.value }, { translateY: p4y.value }, { scale: p4s.value }] }));
  const ps5 = useAnimatedStyle(() => ({ backgroundColor: PARTICLE_COLORS[5], opacity: p5o.value, transform: [{ translateX: p5x.value }, { translateY: p5y.value }, { scale: p5s.value }] }));
  const particleStyles = [ps0, ps1, ps2, ps3, ps4, ps5];

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: circleScale.value }] }));
  const ringStyle   = useAnimatedStyle(() => ({ transform: [{ scale: ringScale.value }], opacity: ringOpacity.value }));

  function handlePress() {
    if (!isActive) {
      circleScale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withTiming(1.0, { duration: 200 }),
      );
      ringScale.value = 1;
      ringOpacity.value = withSequence(
        withTiming(0.8, { duration: 40 }),
        withDelay(80, withTiming(0, { duration: 300 })),
      );
      ringScale.value = withTiming(1.9, { duration: 380 });

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
      circleScale.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(1.0, { duration: 150 }),
      );
    }
    onPress();
  }

  return (
    <TouchableOpacity
      style={styles.heartBtn}
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={1}
    >
      <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" />
      {particleStyles.map((style, i) => (
        <Animated.View key={i} style={[styles.particle, style]} pointerEvents="none" />
      ))}
      <Animated.View style={[styles.heartCircle, isActive && styles.heartCircleActive, circleStyle]}>
        <Ionicons
          name={isActive ? 'heart' : 'heart-outline'}
          size={14}
          color={isActive ? colors.heartRed : 'rgba(255,255,255,0.9)'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export const BookCard = React.memo(function BookCard({ book, onPress }) {
  const { wishlistIds, toggleWishlist } = useAuth();
  const isInWishlist = wishlistIds.has(book.id);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.coverContainer}>
        {book.cover_url ? (
          <Image
            source={{ uri: book.cover_url }}
            style={styles.cover}
            contentFit="cover"
            placeholder={BLURHASH}
            transition={200}
            cachePolicy="disk"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="book" size={32} color={colors.muted} />
          </View>
        )}
        <HeartButton
          isActive={isInWishlist}
          onPress={() => toggleWishlist(book.id, {
            title: book.title, author: book.author,
            coverUrl: book.cover_url, minPrice: book.min_price,
            storeCount: book.store_count,
          })}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{book.author}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{book.min_price} RSD</Text>
          {book.cheapest_store && (
            <View style={styles.storeBadge}>
              <Text style={styles.storeCount}>{STORE_LABELS[book.cheapest_store] ?? book.cheapest_store}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

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
  coverContainer: { height: 160, backgroundColor: '#EEEEf8' },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heartBtn: {
    position: 'absolute',
    top: 8, right: 8,
    width: 28, height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 28, height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.heartRed,
  },
  particle: {
    position: 'absolute',
    width: 6, height: 6,
    borderRadius: 3,
  },
  heartCircle: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  heartCircleActive: { backgroundColor: colors.white },
  info: { padding: 10 },
  title: { fontSize: 13, fontWeight: '600', color: colors.textDark, marginBottom: 3 },
  author: { fontSize: 11, color: colors.muted2, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 13, fontWeight: '700', color: colors.violet },
  storeBadge: { backgroundColor: colors.mint, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  storeCount: { fontSize: 10, fontWeight: '600', color: colors.white },
});
