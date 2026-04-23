import { useState, useCallback, useRef } from 'react';
import { BASE_URL } from '../utils/api';

const LIMIT = 30;

export function useBooks({ authorFilter } = {}) {
  const [books, setBooks] = useState([]);
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);

  const buildURL = useCallback((page, searchQuery, category) => {
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (searchQuery) params.append('q', searchQuery);
    if (category) params.append('category', category);
    if (authorFilter) params.append('author', authorFilter);
    return `${BASE_URL}/books?${params.toString()}`;
  }, [authorFilter]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/books/categories`);
      const data = await res.json();
      setCategories(data);
    } catch {}
  }, []);

  const loadFeatured = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/books/featured?limit=12`);
      const data = await res.json();
      setFeaturedBooks(data);
    } catch {}
  }, []);

  const load = useCallback(async (page, searchQuery, category, isRefresh = false) => {
    setIsLoading(true);
    try {
      const res = await fetch(buildURL(page, searchQuery, category));
      const json = await res.json();
      const newBooks = json.books ?? [];
      if (isRefresh || page === 1) {
        setBooks(newBooks);
      } else {
        setBooks(prev => [...prev, ...newBooks]);
      }
      setHasMore((isRefresh ? newBooks.length : 0) < json.total || page > 1);
    } catch {}
    setIsLoading(false);
  }, [buildURL]);

  const refresh = useCallback(async (searchQuery = '', category = null) => {
    pageRef.current = 1;
    setHasMore(true);
    await load(1, searchQuery, category, true);
  }, [load]);

  const loadMore = useCallback(async (searchQuery = '', category = null) => {
    if (isLoading || !hasMore) return;
    pageRef.current += 1;
    await load(pageRef.current, searchQuery, category, false);
  }, [isLoading, hasMore, load]);

  const fetchDetail = useCallback(async (id) => {
    const res = await fetch(`${BASE_URL}/books/${id}`);
    if (!res.ok) throw new Error('Not found');
    return res.json();
  }, []);

  return {
    books, featuredBooks, categories,
    selectedCategory, setSelectedCategory,
    isLoading, hasMore,
    loadCategories, loadFeatured,
    refresh, loadMore, fetchDetail,
  };
}
