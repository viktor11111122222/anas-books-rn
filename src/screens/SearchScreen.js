import React, { useEffect, useRef, useCallback, useState, memo } from 'react';
import {
  View, Text, FlatList, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Keyboard, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBooks } from '../hooks/useBooks';
import { colors } from '../utils/colors';

const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
const RECENT_KEY = 'recent_books_v1';
const MAX_RECENT = 8;

const CATEGORY_META = {
  romani:      { label: 'Romani',      icon: 'book',          color: '#7C5CBF', bg: '#EDE8F8' },
  deca:        { label: 'Deca',        icon: 'happy',         color: '#F5A623', bg: '#FEF3E2' },
  istorija:    { label: 'Istorija',    icon: 'time',          color: '#5BB8F5', bg: '#E5F4FE' },
  nauka:       { label: 'Nauka',       icon: 'flask',         color: '#4DC9A0', bg: '#E3F7F1' },
  psihologija: { label: 'Psihologija', icon: 'pulse',         color: '#E8445A', bg: '#FDEBEE' },
  biznis:      { label: 'Biznis',      icon: 'briefcase',     color: '#34C759', bg: '#E5F7EA' },
  filozofija:  { label: 'Filozofija',  icon: 'bulb',          color: '#FF9500', bg: '#FEF3E2' },
  religija:    { label: 'Religija',    icon: 'heart',         color: '#AF52DE', bg: '#F3E8FD' },
  umetnost:    { label: 'Umetnost',    icon: 'color-palette', color: '#FF2D55', bg: '#FDEBF0' },
  kuvari:      { label: 'Kuvari',      icon: 'restaurant',    color: '#FF6B35', bg: '#FEF0EB' },
  biografije:  { label: 'Biografije',  icon: 'person',        color: '#5BB8F5', bg: '#E5F4FE' },
  ostalo:      { label: 'Ostalo',      icon: 'grid',          color: '#8E8EA0', bg: '#F0F0F8' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadRecentBooks() {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveRecentBook(book, current) {
  const next = [book, ...current.filter(b => b.id !== book.id)].slice(0, MAX_RECENT);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

async function deleteRecentBook(bookId, current) {
  const next = current.filter(b => b.id !== bookId);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

// ── Result row ────────────────────────────────────────────────────────────────

const ResultRow = memo(function ResultRow({ book, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rowCover}>
        {book.cover_url ? (
          <Image
            source={{ uri: book.cover_url }}
            style={styles.rowCoverImg}
            contentFit="cover"
            placeholder={BLURHASH}
            transition={150}
            cachePolicy="disk"
          />
        ) : (
          <View style={styles.rowCoverFallback}>
            <Ionicons name="book" size={22} color={colors.muted} />
          </View>
        )}
      </View>

      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.rowAuthor} numberOfLines={1}>{book.author}</Text>
        <View style={styles.rowMeta}>
          <Text style={styles.rowPrice}>{book.min_price} RSD</Text>
          {book.store_count > 1 && (
            <View style={styles.rowBadge}>
              <Ionicons name="storefront" size={9} color={colors.violet} />
              <Text style={styles.rowBadgeText}>{book.store_count} prod.</Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
});

// ── Category tile ─────────────────────────────────────────────────────────────

const CategoryTile = memo(function CategoryTile({ category, onPress }) {
  const meta = CATEGORY_META[category] ?? { label: category, icon: 'grid', color: colors.violet, bg: '#EDE8F8' };
  return (
    <TouchableOpacity style={[styles.tile, { backgroundColor: meta.bg }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.tileIcon, { backgroundColor: meta.color + '22' }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <Text style={[styles.tileLabel, { color: meta.color }]}>{meta.label}</Text>
    </TouchableOpacity>
  );
});

// ── Main screen ───────────────────────────────────────────────────────────────

export function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);
  const currentQuery = useRef('');
  const currentCategory = useRef(null);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const recentRef = useRef([]);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const {
    books, categories,
    isLoading, hasMore,
    loadCategories, refresh, loadMore,
  } = useBooks();

  const totalBooks = categories.reduce((s, c) => s + (c.count ?? 0), 0);

  useEffect(() => {
    loadCategories();
    loadRecentBooks().then(data => {
      recentRef.current = data;
      setRecentSearches(data);
    });
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      setTimeout(() => inputRef.current?.focus(), 120);
    });
    return unsub;
  }, [navigation]);

  const doSearch = useCallback((q, cat) => {
    if (!q.trim() && !cat) {
      setHasSearched(false);
      return;
    }
    setHasSearched(true);
    refresh(q.trim(), cat);
  }, [refresh]);

  const handleQueryChange = useCallback((text) => {
    setQuery(text);
    currentQuery.current = text;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      doSearch(text, currentCategory.current);
    }, 150);
  }, [doSearch]);

  const handleRecentDelete = useCallback(async (bookId) => {
    const next = await deleteRecentBook(bookId, recentRef.current);
    recentRef.current = next;
    setRecentSearches(next);
  }, []);

  const handleClearAllRecent = useCallback(async () => {
    await AsyncStorage.removeItem(RECENT_KEY);
    recentRef.current = [];
    setRecentSearches([]);
  }, []);

  const handleCategoryPress = useCallback((cat) => {
    const next = activeCategory === cat ? null : cat;
    setActiveCategory(next);
    currentCategory.current = next;
    doSearch(currentQuery.current, next);
  }, [activeCategory, doSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setActiveCategory(null);
    currentQuery.current = '';
    currentCategory.current = null;
    setHasSearched(false);
    inputRef.current?.focus();
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) loadMore(currentQuery.current, currentCategory.current);
  }, [hasMore, isLoading, loadMore]);

  const handleBookPress = useCallback(async (book) => {
    const next = await saveRecentBook(book, recentRef.current);
    recentRef.current = next;
    setRecentSearches(next);
    navigation.navigate('BookDetail', { bookId: book.id });
  }, [navigation]);

  const keyExtractor = useCallback((item) => String(item.id), []);

  const renderResult = useCallback(({ item }) => (
    <ResultRow book={item} onPress={() => handleBookPress(item)} />
  ), [handleBookPress]);

  const renderFooter = useCallback(() =>
    isLoading && books.length > 0
      ? <ActivityIndicator style={{ padding: 20 }} color={colors.violet} />
      : null,
  [isLoading, books.length]);

  const showIdle = !hasSearched;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Pretraži knjige</Text>
          {totalBooks > 0 && (
            <View style={styles.statBadge}>
              <Text style={styles.statText}>{totalBooks.toLocaleString()} knjiga</Text>
            </View>
          )}
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={colors.muted} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Naslov, autor, ISBN..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            onSubmitEditing={() => {
              clearTimeout(debounceTimer.current);
              doSearch(currentQuery.current, currentCategory.current);
              Keyboard.dismiss();
            }}
          />
          {(query.length > 0 || activeCategory) ? (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Results state */}
      {!showIdle ? (
        <>
          {/* Active filters row */}
          <View style={styles.filtersRow}>
            {activeCategory && (() => {
              const meta = CATEGORY_META[activeCategory] ?? { label: activeCategory, color: colors.violet, bg: '#EDE8F8' };
              return (
                <TouchableOpacity style={[styles.activePill, { backgroundColor: meta.bg }]} onPress={() => handleCategoryPress(activeCategory)}>
                  <Text style={[styles.activePillText, { color: meta.color }]}>{meta.label}</Text>
                  <Ionicons name="close" size={12} color={meta.color} />
                </TouchableOpacity>
              );
            })()}
            <Text style={styles.resultCount}>
              {isLoading ? 'Tražim...' : `${books.length} rezultata`}
            </Text>
          </View>

          <FlatList
            data={books}
            keyExtractor={keyExtractor}
            renderItem={renderResult}
            ListEmptyComponent={
              isLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color={colors.violet} />
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="search" size={32} color={colors.violet} />
                  </View>
                  <Text style={styles.emptyTitle}>Nema rezultata</Text>
                  <Text style={styles.emptyText}>Pokušaj sa drugim pojmom ili promeni kategoriju</Text>
                </View>
              )
            }
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            maxToRenderPerBatch={10}
            initialNumToRender={10}
            windowSize={5}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.idleContent}
        >
          {/* Recently viewed books */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Nedavno gledano</Text>
              {recentSearches.length > 0 && (
                <TouchableOpacity onPress={handleClearAllRecent}>
                  <Text style={styles.clearAll}>Obriši sve</Text>
                </TouchableOpacity>
              )}
            </View>
            {recentSearches.length === 0 ? (
              <View style={styles.recentEmpty}>
                <Ionicons name="time-outline" size={18} color={colors.muted} />
                <Text style={styles.recentEmptyText}>Ovde će se prikazati knjige koje si pregledao</Text>
              </View>
            ) : (
              <View style={styles.recentList}>
                {(showAllRecent ? recentSearches : recentSearches.slice(0, 3)).map(book => (
                  <View key={book.id} style={styles.recentRow}>
                    <TouchableOpacity
                      style={styles.recentRowInner}
                      onPress={() => handleBookPress(book)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.rowCover}>
                        {book.cover_url ? (
                          <Image
                            source={{ uri: book.cover_url }}
                            style={styles.rowCoverImg}
                            contentFit="cover"
                            placeholder={BLURHASH}
                            transition={150}
                            cachePolicy="disk"
                          />
                        ) : (
                          <View style={styles.rowCoverFallback}>
                            <Ionicons name="book" size={18} color={colors.muted} />
                          </View>
                        )}
                      </View>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{book.title}</Text>
                        <Text style={styles.rowAuthor} numberOfLines={1}>{book.author}</Text>
                        {book.min_price != null && (
                          <Text style={styles.rowPrice}>{book.min_price} RSD</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRecentDelete(book.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.recentDelete}
                    >
                      <Ionicons name="close" size={16} color={colors.muted} />
                    </TouchableOpacity>
                  </View>
                ))}
                {recentSearches.length > 3 && (
                  <TouchableOpacity
                    style={styles.showMoreBtn}
                    onPress={() => setShowAllRecent(v => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.showMoreText}>
                      {showAllRecent ? 'Prikaži manje' : `Prikaži još ${recentSearches.length - 3}`}
                    </Text>
                    <Ionicons
                      name={showAllRecent ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={colors.violet}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Categories */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Kategorije</Text>
              </View>
              <View style={styles.tilesGrid}>
                {categories.map(cat => (
                  <CategoryTile
                    key={cat.category}
                    category={cat.category}
                    onPress={() => handleCategoryPress(cat.category)}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.background,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textDark,
  },
  statBadge: {
    backgroundColor: colors.violet + '18',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.violet,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textDark,
    padding: 0,
  },

  // Idle layout
  idleContent: { paddingBottom: 32 },
  section: { paddingTop: 4, paddingBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  clearAll: { fontSize: 13, color: colors.violet, fontWeight: '600' },

  // Recently viewed
  recentList: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  recentRowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  recentDelete: { padding: 4 },
  recentEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recentEmptyText: { fontSize: 14, color: colors.muted, flex: 1, lineHeight: 19 },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  showMoreText: { fontSize: 13, fontWeight: '600', color: colors.violet },

  // Category tiles
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  tile: {
    width: '47.5%',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    minHeight: 82,
    justifyContent: 'center',
  },
  tileIcon: {
    width: 36, height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileLabel: { fontSize: 13, fontWeight: '700' },

  // Results
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activePillText: { fontSize: 13, fontWeight: '600' },
  resultCount: { fontSize: 13, color: colors.muted },

  listContent: { paddingBottom: 24, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    gap: 14,
  },
  rowCover: {
    width: 52, height: 74,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EEEEFC',
  },
  rowCoverImg: { width: '100%', height: '100%' },
  rowCoverFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  rowInfo: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark, lineHeight: 19 },
  rowAuthor: { fontSize: 12, color: colors.muted2 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  rowPrice: { fontSize: 14, fontWeight: '800', color: colors.violet },
  rowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.violet + '15',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6,
  },
  rowBadgeText: { fontSize: 10, fontWeight: '600', color: colors.violet },
  separator: { height: 1, backgroundColor: colors.background, marginLeft: 82 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 40 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.violet + '15',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
