import React, { useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BookCard } from '../components/BookCard';
import { FeaturedCarousel, PeekCarousel } from '../components/FeaturedCarousel';
import { useBooks } from '../hooks/useBooks';
import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/colors';

const CATEGORY_LABELS = {
  romani: 'Romani', deca: 'Deca', istorija: 'Istorija', nauka: 'Nauka',
  psihologija: 'Psihologija', biznis: 'Biznis', filozofija: 'Filozofija',
  religija: 'Religija', umetnost: 'Umetnost', kuvari: 'Kuvari',
  biografije: 'Biografije', ostalo: 'Ostalo',
};

const CategoryChip = memo(function CategoryChip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
});

function ExchangeBanner({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.exchangeBannerWrap}>
      <LinearGradient
        colors={['#7C5CBF', '#5BB8F5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.exchangeBanner}
      >
        <View style={styles.exchangeBannerIcon}>
          <Ionicons name="swap-horizontal" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exchangeBannerTitle}>Razmena knjiga</Text>
          <Text style={styles.exchangeBannerSub}>Zameni knjige sa drugim korisnicima</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function BooksScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { libraryIds } = useAuth();
  const {
    books, featuredBooks, recommendedBooks, forYouBooks, categories,
    selectedCategory, setSelectedCategory,
    isLoading, hasMore,
    loadCategories, loadFeatured, loadRecommended, loadForYou, refresh, loadMore,
  } = useBooks();

  const currentCategory = useRef(null);
  const currentSearch   = useRef('');

  useEffect(() => {
    Promise.allSettled([loadCategories(), loadFeatured(), loadRecommended(), loadForYou(), refresh('', null)]);
  }, []);

  useFocusEffect(useCallback(() => {
    loadRecommended();
    loadForYou();
  }, [loadRecommended, loadForYou]));

const handleCategorySelect = useCallback((cat) => {
    const newCat = selectedCategory === cat ? null : cat;
    setSelectedCategory(newCat);
    currentCategory.current = newCat;
    refresh(currentSearch.current, newCat);
  }, [selectedCategory, setSelectedCategory, refresh]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) loadMore(currentSearch.current, currentCategory.current);
  }, [hasMore, isLoading, loadMore]);

  const handleBookPress = useCallback((bookId) => {
    navigation.navigate('BookDetail', { bookId });
  }, [navigation]);

  const handleFeaturedPress = useCallback((book) => {
    navigation.navigate('BookDetail', { bookId: book.id });
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refresh(currentSearch.current, currentCategory.current);
    loadRecommended();
    loadForYou();
  }, [refresh, loadRecommended, loadForYou]);

const sectionTitle = selectedCategory
    ? (CATEGORY_LABELS[selectedCategory] ?? selectedCategory)
    : 'Sve knjige';

  const filteredFeatured    = featuredBooks.filter(b => !libraryIds.has(b.id));
  const filteredBooks       = books.filter(b => !libraryIds.has(b.id));
  const filteredRecommended = recommendedBooks.filter(b => !libraryIds.has(b.id));
  const filteredForYou      = forYouBooks.filter(b => !libraryIds.has(b.id));
  const showFeatured    = filteredFeatured.length > 0 && !selectedCategory;
  const showRecommended = filteredRecommended.length > 0 && !selectedCategory;
  const showForYou      = filteredForYou.length > 0 && !selectedCategory;

  const renderHeader = () => (
    <View>
      <ExchangeBanner onPress={() => navigation.navigate('Exchange')} />
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsScroll}
        >
          <CategoryChip label="Sve" selected={!selectedCategory} onPress={() => handleCategorySelect(null)} />
          {categories.map(cat => (
            <CategoryChip
              key={cat.category}
              label={CATEGORY_LABELS[cat.category] ?? cat.category}
              selected={selectedCategory === cat.category}
              onPress={() => handleCategorySelect(cat.category)}
            />
          ))}
        </ScrollView>
      )}

      {showFeatured && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Najpopularnije</Text>
          </View>
          <FeaturedCarousel books={filteredFeatured} onBookPress={handleFeaturedPress} />
        </View>
      )}

      {showForYou && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Za tebe</Text>
            <View style={styles.sectionBadge}>
              <Ionicons name="sparkles" size={11} color={colors.violet} />
              <Text style={styles.sectionBadgeText}>Na osnovu pretraživanja</Text>
            </View>
          </View>
          <FeaturedCarousel books={filteredForYou} onBookPress={handleFeaturedPress} />
        </View>
      )}

      {showRecommended && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Preporučeno</Text>
          </View>
          <PeekCarousel books={filteredRecommended} onBookPress={handleFeaturedPress} />
        </View>
      )}

<Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginTop: (showFeatured || showForYou || showRecommended) ? 16 : 12, marginBottom: 8 }]}>
        {sectionTitle}
      </Text>
    </View>
  );

  const renderItem = useCallback(({ item }) => (
    <View style={styles.cardWrapper}>
      <BookCard book={item} onPress={() => handleBookPress(item.id)} />
    </View>
  ), [handleBookPress]);

  const renderFooter = useCallback(() =>
    isLoading && books.length > 0
      ? <ActivityIndicator style={{ padding: 20 }} color={colors.violet} />
      : null,
  [isLoading, books.length]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name={selectedCategory ? 'filter' : 'library'} size={48} color={colors.muted} />
        <Text style={styles.emptyText}>
          {selectedCategory ? 'Nema knjiga u ovoj kategoriji' : 'Nema knjiga'}
        </Text>
      </View>
    );
  }, [isLoading, selectedCategory]);

  const keyExtractor = useCallback((item) => String(item.id), []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        <Image source={require('../../assets/logo.png')} style={styles.navLogo} resizeMode="contain" />
      </View>

      {isLoading && books.length === 0 ? (
        <View style={styles.centerLoad}>
          <ActivityIndicator size="large" color={colors.violet} />
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && books.length === 0}
              onRefresh={handleRefresh}
              tintColor={colors.violet}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={6}
          initialNumToRender={6}
          windowSize={5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  navBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  navLogo: { height: 52, width: 200 },
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chipsScroll: { backgroundColor: colors.background },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#F0EFF8', borderRadius: 20 },
  chipSelected: { backgroundColor: colors.violet },
  chipText: { fontSize: 13, color: '#6B6B8E' },
  chipTextSelected: { color: colors.white, fontWeight: '600' },
  section: { marginTop: 16 },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 10, gap: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark },
  sectionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.violet + '14', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  sectionBadgeText: { fontSize: 10, fontWeight: '600', color: colors.violet },
  listContent: { paddingBottom: 24 },
  row: { paddingHorizontal: 16, gap: 14, marginBottom: 14 },
  cardWrapper: { flex: 1 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 40 },

  exchangeBannerWrap: { marginHorizontal: 16, marginBottom: 12 },
  exchangeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
  },
  exchangeBannerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  exchangeBannerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  exchangeBannerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});
