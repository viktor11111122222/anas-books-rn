import { useState, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL, apiRequest } from '../utils/api';

const LIMIT = 30;

function normalizeTitle(title) {
  return (title ?? '')
    .toLowerCase()
    .replace(/[čćžšđ]/g, c => ({ č: 'c', ć: 'c', ž: 'z', š: 's', đ: 'd' })[c] || c)
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

const GENERIC_AUTHORS = new Set(['nepoznat autor', 'nepoznati autor', 'unknown', 'autor nepoznat']);

function dedupeBooks(incoming, existing = []) {
  const seenIds   = new Set(existing.map(b => b.id));
  const seenTitles = new Map(); // normalizedTitle → index in result

  // Seed from existing
  existing.forEach((b) => seenTitles.set(normalizeTitle(b.title), -1));

  const result = [];
  for (const b of incoming) {
    if (seenIds.has(b.id)) continue;
    seenIds.add(b.id);

    const tk = normalizeTitle(b.title);
    if (!tk) { result.push(b); continue; }

    if (!seenTitles.has(tk)) {
      seenTitles.set(tk, result.length);
      result.push(b);
    } else {
      // Title already seen — replace only if current entry has a real author
      // and the stored one has a generic/missing author
      const idx = seenTitles.get(tk);
      if (idx >= 0) {
        const stored = result[idx];
        const storedGeneric = GENERIC_AUTHORS.has((stored.author ?? '').toLowerCase().trim());
        const incomingReal  = !GENERIC_AUTHORS.has((b.author ?? '').toLowerCase().trim()) && b.author;
        if (storedGeneric && incomingReal) {
          result[idx] = b;
          seenTitles.set(tk, idx);
        }
      }
    }
  }
  return result;
}

export function useBooks({ authorFilter } = {}) {
  const [books, setBooks] = useState([]);
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [forYouBooks, setForYouBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(null);
  const pageRef = useRef(1);
  const abortRef = useRef(null);

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

  const loadRecommended = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;
      const data = await apiRequest('/books/recommended', {}, token);
      setRecommendedBooks(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const loadForYou = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return;
      const data = await apiRequest('/books/for-you', {}, token);
      setForYouBooks(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  const load = useCallback(async (page, searchQuery, category, isRefresh = false) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const res = await fetch(buildURL(page, searchQuery, category), {
        signal: controller.signal,
      });
      const json = await res.json();
      const newBooks = json.books ?? [];
      if (isRefresh || page === 1) {
        setBooks(dedupeBooks(newBooks));
        if (json.total != null) setTotal(json.total);
      } else {
        setBooks(prev => [...prev, ...dedupeBooks(newBooks, prev)]);
      }
      setHasMore(newBooks.length === LIMIT);
    } catch (e) {
      if (e.name === 'AbortError') return;
    } finally {
      setIsLoading(false);
    }
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`${BASE_URL}/books/${id}`, { signal: controller.signal });
      if (!res.ok) throw new Error('Not found');
      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  const fetchSimilar = useCallback(async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/books/${id}/similar`);
      if (!res.ok) return [];
      return res.json();
    } catch { return []; }
  }, []);

  const fetchByAuthor = useCallback(async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/books/${id}/by-author`);
      if (!res.ok) return [];
      return res.json();
    } catch { return []; }
  }, []);

  return {
    books, featuredBooks, recommendedBooks, forYouBooks, categories,
    selectedCategory, setSelectedCategory,
    isLoading, hasMore, total,
    loadCategories, loadFeatured, loadRecommended, loadForYou,
    refresh, loadMore, fetchDetail, fetchSimilar, fetchByAuthor,
  };
}
