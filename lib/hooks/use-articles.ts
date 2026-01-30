'use client';

import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher, post, ApiError } from '@/lib/fetcher';

/**
 * 分类类型
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
}

/**
 * 文章类型
 */
export interface Article {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  coverImage: string | null;
  published: boolean;
  categoryId: string | null;
  category: Category | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 文章列表项（不含 content）
 */
export type ArticleListItem = Omit<Article, 'content'>;

/**
 * 分页信息
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * 文章列表响应
 */
export interface ArticleListData {
  list: ArticleListItem[];
  pagination: Pagination;
}

/**
 * 文章列表查询参数
 */
export interface ArticleListOptions {
  published?: boolean;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
  showAll?: boolean; // 显示所有文章（包括草稿）
}

/**
 * 创建/更新文章的数据
 */
export interface ArticleInput {
  id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  coverImage?: string | null;
  published?: boolean;
  categoryId?: string | null;
}

/**
 * 构建文章列表 URL
 */
function buildArticleListUrl(options?: ArticleListOptions): string {
  const params = new URLSearchParams();
  
  if (options?.showAll) {
    // showAll 时不添加 published 参数，获取全部文章
  } else if (options?.published !== undefined) {
    params.set('published', String(options.published));
  }
  if (options?.categoryId) {
    params.set('categoryId', options.categoryId);
  }
  if (options?.search) {
    params.set('search', options.search);
  }
  if (options?.page) {
    params.set('page', String(options.page));
  }
  if (options?.limit) {
    params.set('limit', String(options.limit));
  }

  const queryString = params.toString();
  return `/api/article/list${queryString ? `?${queryString}` : ''}`;
}

/**
 * 获取文章列表
 */
export function useArticleList(options?: ArticleListOptions) {
  const url = buildArticleListUrl(options);
  return useSWR<ArticleListData, ApiError>(url, fetcher);
}

/**
 * 获取单篇文章
 */
export function useArticle(id: string | null) {
  return useSWR<Article, ApiError>(
    id ? `/api/article/detail?id=${id}` : null,
    fetcher
  );
}

/**
 * 创建文章的 mutation
 */
async function createArticleFetcher(
  url: string,
  { arg }: { arg: Omit<ArticleInput, 'id'> }
) {
  const res = await post<Article>(url, arg);
  return res.data;
}

export function useCreateArticle() {
  return useSWRMutation('/api/article/create', createArticleFetcher);
}

/**
 * 更新文章的 mutation
 */
async function updateArticleFetcher(
  url: string,
  { arg }: { arg: ArticleInput & { id: string } }
) {
  const res = await post<Article>(url, arg);
  return res.data;
}

export function useUpdateArticle() {
  return useSWRMutation('/api/article/update', updateArticleFetcher);
}

/**
 * 删除文章的 mutation
 */
async function deleteArticleFetcher(
  url: string,
  { arg }: { arg: { id: string } }
) {
  await post(url, arg);
}

export function useDeleteArticle() {
  return useSWRMutation('/api/article/delete', deleteArticleFetcher);
}
