import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookCard } from '../components/BookCard';
import { useBooks } from '../hooks/useBooks';
import { colors } from '../utils/colors';

export function AuthorBooksScreen({ route, navigation }) {
  const { author } = route.params;
  const insets = useSafeAreaInsets();
  const { books, isLoading, hasMore, refresh, loadMore } = useBooks({ authorFilter: author });

  useEffect(() => { refresh('', null); }, []);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) loadMore('', null);
  }, [hasMore, isLoading]);

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <BookCard
        book={item}
        onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
      />
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{author}</Text>
        <View style={{ width: 38 }} />
      </View>

      {isLoading && books.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.violet} /></View>
      ) : books.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyText}>Nema knjiga ovog autora</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isLoading ? <ActivityIndicator style={{ padding: 20 }} color={colors.violet} /> : null}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F4F4FB', justifyContent: 'center', alignItems: 'center',
  },
  navTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: colors.muted },
  listContent: { padding: 16, paddingBottom: 24 },
  row: { gap: 14, marginBottom: 14 },
  cardWrapper: { flex: 1 },
});
