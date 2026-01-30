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
 * 获取 API Key（从 localStorage）
 */
function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_api_key');
}

/**
 * 基础 fetcher - 用于 SWR
 * 自动处理 JSON 解析和错误
 */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || json.code >= 400) {
    throw new ApiError(json.message || 'Request failed', json.code);
  }

  return json.data as T;
}

/**
 * 带认证的 fetcher - 用于需要 API Key 的请求
 */
export async function authFetcher<T>(url: string): Promise<T> {
  const apiKey = getApiKey();
  
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey && { 'x-api-key': apiKey }),
    },
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || json.code >= 400) {
    throw new ApiError(json.message || 'Request failed', json.code);
  }

  return json.data as T;
}

/**
 * POST 请求
 */
export async function post<T, D extends object = Record<string, unknown>>(
  url: string,
  data: D,
  options?: FetcherOptions
): Promise<ApiResponse<T>> {
  const apiKey = getApiKey();
  const { body: _, headers, ...restOptions } = options || {};

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey && { 'x-api-key': apiKey }),
      ...headers,
    },
    body: JSON.stringify(data),
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
    ...restOptions,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || json.code >= 400) {
    throw new ApiError(json.message || 'Request failed', json.code);
  }

  return json;
}
