import type { ApiResponse } from './api-response';

/**
 * 请求配置
 */
export interface FetcherOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown>;
}

/**
 * API 请求错误
 */
export class ApiError extends Error {
  code: number;
  
  constructor(message: string, code: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * 基础 fetcher - 用于 SWR
 * 使用 cookies 进行认证（NextAuth session）
 */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // 包含 cookies
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || json.code >= 400) {
    throw new ApiError(json.message || 'Request failed', json.code);
  }

  return json.data as T;
}

/**
 * 带认证的 fetcher（使用 session cookies）
 */
export async function authFetcher<T>(url: string): Promise<T> {
  return fetcher<T>(url);
}

/**
 * POST 请求
 */
export async function post<T, D extends object = Record<string, unknown>>(
  url: string,
  data: D,
  options?: FetcherOptions
): Promise<ApiResponse<T>> {
  const { body: _, headers, ...restOptions } = options || {};

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
    credentials: 'include',
    ...restOptions,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || json.code >= 400) {
    throw new ApiError(json.message || 'Request failed', json.code);
  }

  return json;
}

/**
 * GET 请求
 */
export async function get<T>(
  url: string,
  options?: FetcherOptions
): Promise<ApiResponse<T>> {
  const { body: _, headers, ...restOptions } = options || {};

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
    ...restOptions,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || json.code >= 400) {
    throw new ApiError(json.message || 'Request failed', json.code);
  }

  return json;
}
