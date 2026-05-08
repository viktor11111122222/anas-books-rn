import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

function cleanTitle(title) {
  let t = title;
  if (t.toLowerCase().startsWith('laguna - ')) t = t.slice(9);
  return t.split(' - ')[0];
}

export function FeaturedCarousel({ books, onBookPress }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (books.length < 2) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const next = (prev + 1) % books.length;
        flatListRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(timerRef.current);
  }, [books.length]);

  function onScrollEnd(e) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  }

  if (!books.length) return null;

  return (
    <View>
      <ScrollView
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
      >
        {books.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.slide}
            onPress={() => onBookPress(item)}
            activeOpacity={0.95}
          >
            <View style={styles.card}>
              {item.cover_url ? (
                <Image
                  source={{ uri: item.cover_url }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  placeholder={BLURHASH}
                  transition={200}
                  cachePolicy="disk"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
                  <Ionicons name="book" size={48} color={colors.muted} />
                </View>
              )}
              <View style={styles.band}>
                <Text style={styles.bandTitle} numberOfLines={2}>{cleanTitle(item.title)}</Text>
                <View style={styles.bandRow}>
                  <Text style={styles.bandAuthor} numberOfLines={1}>{item.author}</Text>
                  <Text style={styles.bandPrice}>od {item.min_price} RSD</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {books.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: CARD_MARGIN,
  },
  card: {
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E0E0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0F0',
  },
  band: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  bandTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },
  bandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bandAuthor: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  bandPrice: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.violet,
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#D0D0E8',
  },
});
