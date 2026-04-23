import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookCard } from '../components/BookCard';
import { FeaturedCarousel } from '../components/FeaturedCarousel';
import { useBooks } from '../hooks/useBooks';
import { colors } from '../utils/colors';

const CATEGORY_LABELS = {
  romani: 'Romani', deca: 'Deca', istorija: 'Istorija', nauka: 'Nauka',
  psihologija: 'Psihologija', biznis: 'Biznis', filozofija: 'Filozofija',
  religija: 'Religija', umetnost: 'Umetnost', kuvari: 'Kuvari',
  biografije: 'Biografije', ostalo: 'Ostalo',
};

export function BooksScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimer = useRef(null);
  const {
    books, featuredBooks, categories,
    selectedCategory, setSelectedCategory,
    isLoading, hasMore,
    loadCategories, loadFeatured, refresh, loadMore,
  } = useBooks();

  const currentCategory = useRef(null);
  const currentSearch = useRef('');

  useEffect(() => {
    Promise.all([loadCategories(), loadFeatured(), refresh('', null)]);
  }, []);

  function handleSearchChange(text) {
    setSearchQuery(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      currentSearch.current = text;
      refresh(text, currentCategory.current);
    }, 400);
  }

  function handleCategorySelect(cat) {
    const newCat = selectedCategory === cat ? null : cat;
    setSelectedCategory(newCat);
    currentCategory.current = newCat;
    refresh(currentSearch.current, newCat);
  }

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) loadMore(currentSearch.current, currentCategory.current);
  }, [hasMore, isLoading, loadMore]);

  const sectionTitle = selectedCategory
    ? (CATEGORY_LABELS[selectedCategory] ?? selectedCategory)
    : 'Sve knjige';

  const showFeatured = featuredBooks.length > 0 && !selectedCategory && !searchQuery;

  const renderHeader = () => (
    <View>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pretraži knjige..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); handleSearchChange(''); }}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
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

      {/* Featured */}
      {showFeatured && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Najpopularnije</Text>
          <FeaturedCarousel
            books={featuredBooks}
            onBookPress={book => navigation.navigate('BookDetail', { bookId: book.id })}
          />
        </View>
      )}

      <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginTop: showFeatured ? 16 : 12, marginBottom: 8 }]}>
        {sectionTitle}
      </Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <BookCard
        book={item}
        onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
      />
    </View>
  );

  const renderFooter = () =>
    isLoading && books.length > 0 ? (
      <ActivityIndicator style={{ padding: 20 }} color={colors.violet} />
    ) : null;

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name={selectedCategory ? 'filter' : 'library'}
          size={48}
          color={colors.muted}
        />
        <Text style={styles.emptyText}>
          {selectedCategory ? 'Nema knjiga u ovoj kategoriji' : 'Nema knjiga'}
        </Text>
      </View>
    );
  };

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
          data={books}
          keyExtractor={item => String(item.id)}
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
              onRefresh={() => refresh(currentSearch.current, currentCategory.current)}
              tintColor={colors.violet}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function CategoryChip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  navBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    alignItems: 'center',
  },
  navTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark },
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textDark },
  chipsScroll: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#F0EFF8', borderRadius: 20,
  },
  chipSelected: { backgroundColor: colors.violet },
  chipText: { fontSize: 13, color: '#6B6B8E' },
  chipTextSelected: { color: colors.white, fontWeight: '600' },
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: colors.textDark,
  },
  listContent: { paddingBottom: 24 },
  row: { paddingHorizontal: 16, gap: 14, marginBottom: 14 },
  cardWrapper: { flex: 1 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: 'center', paddingHorizontal: 40 },
});
