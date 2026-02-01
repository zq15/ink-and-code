import { NextResponse } from 'next/server';
import { auth } from './auth';

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  message?: string;
}

/**
 * 获取当前登录用户 ID
 * 返回 userId 或 null（未登录）
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id || null;
}

/**
 * 验证用户登录状态
 * 返回 { userId, error }
 */
export async function requireAuth(): Promise<{
  userId: string | null;
  error: NextResponse | null;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { userId: null, error: ApiError.unauthorized('请先登录') };
  }
  return { userId, error: null };
}

/**
 * 成功响应
 */
export function success<T>(data: T, message?: string, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    {
      code: status,
      data,
      message,
    },
    { status }
  );
}

/**
 * 创建成功响应 (201)
 */
export function created<T>(data: T, message = 'Created successfully') {
  return success(data, message, 201);
}

/**
 * 错误响应
 */
export function error(message: string, status = 500) {
  return NextResponse.json<ApiResponse>(
    {
      code: status,
      message,
    },
    { status }
  );
}

/**
 * 常用错误响应
 */
export const ApiError = {
  /** 401 未授权 */
  unauthorized(message = 'Unauthorized') {
    return error(message, 401);
  },

  /** 400 请求参数错误 */
  badRequest(message = 'Bad request') {
    return error(message, 400);
  },

  /** 404 资源不存在 */
  notFound(message = 'Not found') {
    return error(message, 404);
  },

  /** 409 资源冲突 */
  conflict(message = 'Conflict') {
    return error(message, 409);
  },

  /** 500 服务器错误 */
  internal(message = 'Internal server error') {
    return error(message, 500);
  },
};

/**
 * 验证 API Key 的辅助函数
 * 返回 null 表示验证通过，否则返回错误响应
 */
export function validateApiKey(request: Request): NextResponse | null {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return ApiError.unauthorized();
  }
  return null;
}

/**
 * 验证必填字段
 * 返回 null 表示验证通过，否则返回错误响应
 * 注意：空字符串被视为有效值，只有 undefined/null 才视为缺失
 */
export function validateRequired(
  data: Record<string, unknown>,
  fields: string[]
): NextResponse | null {
  const missing = fields.filter((field) => data[field] === undefined || data[field] === null);
  if (missing.length > 0) {
    return ApiError.badRequest(`Missing required fields: ${missing.join(', ')}`);
  }
  return null;
}
