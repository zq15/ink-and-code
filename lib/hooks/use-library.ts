'use client';

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher, post } from '@/lib/fetcher';

/**
 * Book 类型
 */
export interface Book {
  id: string;
  title: string;
  author: string | null;
  cover: string | null;
  description: string | null;
  format: string;
  originalUrl: string;
  readableUrl: string | null;
  fileSize: number;
  metadata: Record<string, unknown> | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  progress?: {
    percentage: number;
    lastReadAt: string;
    totalReadTime: number;
  } | null;
}

export interface BookDetail extends Book {
  progress: ReadingProgress | null;
  bookmarks: BookmarkItem[];
  highlights: HighlightItem[];
}

export interface ReadingProgress {
  id: string;
  bookId: string;
  currentLocation: string | null;
  percentage: number;
  lastReadAt: string;
  totalReadTime: number;
}

export interface BookmarkItem {
  id: string;
  bookId: string;
  title: string | null;
  location: string;
  note: string | null;
  createdAt: string;
}

export interface HighlightItem {
  id: string;
  bookId: string;
  text: string;
  location: string;
  color: string;
  note: string | null;
  createdAt: string;
}

export interface ReadingSettingsData {
  id: string;
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  theme: string;
  pageWidth: number;
}

export interface BookListData {
  list: Book[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 获取书架列表
 */
export function useBookList(search?: string, sort?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);
  params.set('limit', '50');

  const { data, error, isLoading, mutate } = useSWR<BookListData>(
    `/api/library/list?${params.toString()}`,
    fetcher
  );

  return {
    books: data?.list || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}

/**
 * 获取书籍详情
 */
export function useBookDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<BookDetail>(
    id ? `/api/library/detail?id=${id}` : null,
    fetcher
  );

  return { book: data, isLoading, error, mutate };
}

/**
 * 上传书籍
 */
export function useUploadBook() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/library/upload',
    async (url: string, { arg }: { arg: FormData }) => {
      const res = await fetch(url, {
        method: 'POST',
        body: arg,
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || json.code >= 400) {
        throw new Error(json.message || '上传失败');
      }
      return json.data as Book;
    }
  );

  return { upload: trigger, isUploading: isMutating };
}

/**
 * 删除书籍
 */
export function useDeleteBook() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/library/delete',
    async (url: string, { arg }: { arg: { id: string } }) => {
      const res = await post(url, arg);
      return res.data;
    }
  );

  return { deleteBook: trigger, isDeleting: isMutating };
}

/**
 * 保存阅读进度
 */
export function useSaveProgress() {
  const { trigger } = useSWRMutation(
    '/api/library/progress',
    async (url: string, { arg }: { arg: { bookId: string; currentLocation?: string; percentage?: number; readTimeDelta?: number } }) => {
      const res = await post(url, arg);
      return res.data;
    }
  );

  return { saveProgress: trigger };
}

/**
 * 获取阅读设置
 */
export function useReadingSettings() {
  const { data, error, isLoading, mutate } = useSWR<ReadingSettingsData>(
    '/api/library/settings',
    fetcher
  );

  return { settings: data, isLoading, error, mutate };
}

/**
 * 保存阅读设置
 */
export function useSaveReadingSettings() {
  const { trigger } = useSWRMutation(
    '/api/library/settings',
    async (url: string, { arg }: { arg: Partial<ReadingSettingsData> }) => {
      const res = await post(url, arg);
      return res.data;
    }
  );

  return { saveSettings: trigger };
}

/**
 * 书签操作
 */
export function useBookmarks(bookId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<BookmarkItem[]>(
    bookId ? `/api/library/bookmarks?bookId=${bookId}` : null,
    fetcher
  );

  const { trigger: addBookmark } = useSWRMutation(
    '/api/library/bookmarks',
    async (url: string, { arg }: { arg: { bookId: string; title?: string; location: string; note?: string } }) => {
      const res = await post(url, { action: 'add', ...arg });
      return res.data;
    }
  );

  const { trigger: deleteBookmark } = useSWRMutation(
    '/api/library/bookmarks',
    async (url: string, { arg }: { arg: { id: string } }) => {
      const res = await post(url, { action: 'delete', ...arg });
      return res.data;
    }
  );

  return {
    bookmarks: data || [],
    isLoading,
    error,
    mutate,
    addBookmark,
    deleteBookmark,
  };
}

/**
 * 划线笔记操作
 */
export function useHighlights(bookId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<HighlightItem[]>(
    bookId ? `/api/library/highlights?bookId=${bookId}` : null,
    fetcher
  );

  const { trigger: addHighlight } = useSWRMutation(
    '/api/library/highlights',
    async (url: string, { arg }: { arg: { bookId: string; text: string; location: string; color?: string; note?: string } }) => {
      const res = await post(url, { action: 'add', ...arg });
      return res.data;
    }
  );

  const { trigger: deleteHighlight } = useSWRMutation(
    '/api/library/highlights',
    async (url: string, { arg }: { arg: { id: string } }) => {
      const res = await post(url, { action: 'delete', ...arg });
      return res.data;
    }
  );

  const { trigger: updateHighlight } = useSWRMutation(
    '/api/library/highlights',
    async (url: string, { arg }: { arg: { id: string; color?: string; note?: string } }) => {
      const res = await post(url, { action: 'update', ...arg });
      return res.data;
    }
  );

  return {
    highlights: data || [],
    isLoading,
    error,
    mutate,
    addHighlight,
    deleteHighlight,
    updateHighlight,
  };
}
