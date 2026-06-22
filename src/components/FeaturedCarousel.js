import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

function cleanTitle(title) {
  let t = title;
  if (t.toLowerCase().startsWith('laguna - ')) t = t.slice(9);
  return t.split(' - ')[0];
}

export function FeaturedCarousel({ books, onBookPress }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_MARGIN = 16;
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (books.length < 2) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const next = (prev + 1) % books.length;
        flatListRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 3500);
  }, [books.length, SCREEN_WIDTH]);

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [resetTimer]);

  function onScrollEnd(e) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
    resetTimer();
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
            style={[styles.slide, { width: SCREEN_WIDTH, paddingHorizontal: CARD_MARGIN }]}
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
                  {item.min_price != null && <Text style={styles.bandPrice}>od {item.min_price} RSD</Text>}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

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

export function PeekCarousel({ books, onBookPress }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const PEEK_CARD_WIDTH = SCREEN_WIDTH * 0.78;
  const PEEK_GAP = 12;
  const PEEK_SIDE_PADDING = (SCREEN_WIDTH - PEEK_CARD_WIDTH) / 2;
  const STEP = PEEK_CARD_WIDTH + PEEK_GAP;

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);
  const didLayout = useRef(false);
  const n = books.length;

  if (n === 0) return null;

  const looped = n > 1 ? [books[n - 1], ...books, books[0]] : books;

  function onLayout() {
    if (didLayout.current || n <= 1) return;
    didLayout.current = true;
    scrollRef.current?.scrollTo({ x: STEP, animated: false });
  }

  function onScrollEnd(e) {
    const x = e.nativeEvent.contentOffset.x;
    const raw = Math.round(x / STEP);
    if (n === 1) return;
    if (raw === 0) {
      scrollRef.current?.scrollTo({ x: n * STEP, animated: false });
      setCurrentIndex(n - 1);
    } else if (raw === n + 1) {
      scrollRef.current?.scrollTo({ x: STEP, animated: false });
      setCurrentIndex(0);
    } else {
      setCurrentIndex(raw - 1);
    }
  }

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={STEP}
        disableIntervalMomentum
        contentOffset={{ x: n > 1 ? STEP : 0, y: 0 }}
        onLayout={onLayout}
        contentContainerStyle={{ paddingHorizontal: PEEK_SIDE_PADDING }}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
      >
        {looped.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[{ width: PEEK_CARD_WIDTH }, i < looped.length - 1 && { marginRight: PEEK_GAP }]}
            onPress={() => onBookPress(item)}
            activeOpacity={0.95}
          >
            <View style={styles.peekCard}>
              <View style={styles.peekImageWrap}>
                {item.cover_url ? (
                  <Image
                    source={{ uri: item.cover_url }}
                    style={styles.peekImage}
                    contentFit="contain"
                    placeholder={BLURHASH}
                    transition={200}
                    cachePolicy="disk"
                  />
                ) : (
                  <View style={styles.peekImagePlaceholder}>
                    <Ionicons name="book" size={36} color={colors.muted} />
                  </View>
                )}
              </View>
              <View style={styles.peekInfo}>
                <Text style={styles.peekTitle} numberOfLines={2}>{cleanTitle(item.title)}</Text>
                <Text style={styles.peekAuthor} numberOfLines={1}>{item.author}</Text>
                {item.min_price != null && <Text style={styles.peekPrice}>od {item.min_price} RSD</Text>}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {books.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {},
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

  peekCard: {
    flexDirection: 'row',
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  peekImageWrap: {
    width: 100,
    backgroundColor: '#F0EFF8',
  },
  peekImage: {
    width: 100,
    height: 150,
  },
  peekImagePlaceholder: {
    width: 100,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0F0',
  },
  peekInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },
  peekTitle: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  peekAuthor: {
    color: colors.muted,
    fontSize: 11,
  },
  peekPrice: {
    color: colors.violet,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
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
