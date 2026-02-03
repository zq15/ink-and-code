import { NextRequest } from 'next/server';
import { auth } from './auth';
import { prisma } from './prisma';
import { ApiError } from './api-response';
import crypto from 'crypto';

/**
 * 开发者 Token 验证（同步版本）
 * 从请求头或查询参数中获取 token，与环境变量中的 DEVELOPER_TOKEN 比较
 */
export function verifyDeveloperToken(request: NextRequest): boolean {
  const developerToken = process.env.DEVELOPER_TOKEN;
  
  if (!developerToken) {
    console.error('DEVELOPER_TOKEN not configured');
    return false;
  }

  // 从 Authorization header 获取
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token === developerToken) {
      return true;
    }
  }

  // 从查询参数获取
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get('token');
  if (queryToken === developerToken) {
    return true;
  }

  return false;
}

/**
 * 验证结果类型
 */
export interface AuthResult {
  authorized: boolean;
  isDeveloper: boolean;  // 是否是开发者（拥有 DEVELOPER_TOKEN）
  isAdmin: boolean;      // 是否是管理者
  userId?: string;
}

/**
 * 开发者/管理者验证（异步版本，支持 session 验证）
 * 返回详细的权限信息
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AuthResult> {
  const developerToken = process.env.DEVELOPER_TOKEN;
  
  if (!developerToken) {
    console.error('DEVELOPER_TOKEN not configured');
    return { authorized: false, isDeveloper: false, isAdmin: false };
  }

  // 方式1: 从 Authorization header 获取
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token === developerToken) {
      return { authorized: true, isDeveloper: true, isAdmin: false };
    }
  }

  // 方式2: 从查询参数获取
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get('token');
  if (queryToken === developerToken) {
    return { authorized: true, isDeveloper: true, isAdmin: false };
  }

  // 方式3: 通过 session 验证
  try {
    const session = await auth();
    if (session?.user?.id) {
      // 检查是否是开发者（拥有 DEVELOPER_TOKEN）
      const tokenHash = crypto.createHash('sha256').update(developerToken).digest('hex');
      const apiToken = await prisma.apiToken.findFirst({
        where: {
          token: tokenHash,
          userId: session.user.id,
        },
      });
      if (apiToken) {
        return { authorized: true, isDeveloper: true, isAdmin: false, userId: session.user.id };
      }
      
      // 检查是否是管理者
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      });
      if (user?.isAdmin) {
        return { authorized: true, isDeveloper: false, isAdmin: true, userId: session.user.id };
      }
    }
  } catch (error) {
    console.error('Session verification failed:', error);
  }

  return { authorized: false, isDeveloper: false, isAdmin: false };
}

/**
 * 开发者验证（异步版本，支持 session 验证）
 * 简化版本，只返回是否有权限
 */
export async function verifyDeveloper(request: NextRequest): Promise<boolean> {
  const result = await verifyAdminAuth(request);
  return result.authorized;
}

/**
 * 检查用户是否是开发者账号（通过 userId）
 */
export async function isUserDeveloper(userId: string): Promise<boolean> {
  const developerToken = process.env.DEVELOPER_TOKEN;
  if (!developerToken) return false;
  
  const tokenHash = crypto.createHash('sha256').update(developerToken).digest('hex');
  const apiToken = await prisma.apiToken.findFirst({
    where: {
      token: tokenHash,
      userId,
    },
  });
  return !!apiToken;
}

/**
 * 开发者认证中间件包装器
 * 用于包装 API 路由处理函数
 */
export function withDeveloperAuth<T>(
  handler: (request: NextRequest) => Promise<T>
) {
  return async (request: NextRequest): Promise<T | Response> => {
    if (!verifyDeveloperToken(request)) {
      return ApiError.forbidden('无权限访问开发者后台');
    }
    return handler(request);
  };
}

/**
 * 生成随机测试登录码
 */
export function generateTestLoginCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆字符
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
