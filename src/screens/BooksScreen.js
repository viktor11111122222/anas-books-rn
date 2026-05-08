import React, { useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookCard } from '../components/BookCard';
import { FeaturedCarousel } from '../components/FeaturedCarousel';
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

export function BooksScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { libraryIds } = useAuth();
  const {
    books, featuredBooks, categories,
    selectedCategory, setSelectedCategory,
    isLoading, hasMore,
    loadCategories, loadFeatured, refresh, loadMore,
  } = useBooks();

  const currentCategory = useRef(null);
  const currentSearch   = useRef('');

  useEffect(() => {
    Promise.all([loadCategories(), loadFeatured(), refresh('', null)]);
  }, []);

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
  }, [refresh]);

const sectionTitle = selectedCategory
    ? (CATEGORY_LABELS[selectedCategory] ?? selectedCategory)
    : 'Sve knjige';

  const filteredFeatured = featuredBooks.filter(b => !libraryIds.has(b.id));
  const filteredBooks    = books.filter(b => !libraryIds.has(b.id));
  const showFeatured = filteredFeatured.length > 0 && !selectedCategory;

  const renderHeader = () => (
    <View>
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
          <Text style={styles.sectionTitle}>Najpopularnije</Text>
          <FeaturedCarousel books={filteredFeatured} onBookPress={handleFeaturedPress} />
        </View>
      )}

      <Text style={[styles.sectionTitle, { marginTop: showFeatured ? 16 : 12, marginBottom: 8 }]}>
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
        <Text style={styles.navTitle}>AnasBooks</Text>
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
    paddingVertical: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  navTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark },
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chipsScroll: { backgroundColor: colors.background },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#F0EFF8', borderRadius: 20 },
  chipSelected: { backgroundColor: colors.violet },
  chipText: { fontSize: 13, color: '#6B6B8E' },
  chipTextSelected: { color: colors.white, fontWeight: '600' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, paddingHorizontal: 16, marginBottom: 10 },
  listContent: { paddingBottom: 24 },
  row: { paddingHorizontal: 16, gap: 14, marginBottom: 14 },
  cardWrapper: { flex: 1 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 40 },
});
