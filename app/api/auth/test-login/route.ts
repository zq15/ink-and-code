import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/api-response';

/**
 * POST /api/auth/test-login
 * 测试账号快捷登录
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return ApiError.badRequest('缺少登录码');
    }

    // 查找测试账号
    const user = await prisma.user.findUnique({
      where: { testLoginCode: code.toUpperCase() },
    });

    if (!user) {
      return ApiError.notFound('登录码无效');
    }

    if (!user.isTestAccount) {
      return ApiError.badRequest('该账号不是测试账号');
    }

    if (user.bannedAt) {
      return ApiError.forbidden('该账号已被禁用');
    }

    // 创建 session token
    const sessionToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // 创建 session 记录
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });

    // 设置 cookie 并返回
    const response = NextResponse.json({
      code: 200,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      },
      message: '登录成功',
    });

    // 设置 session cookie（Auth.js / NextAuth v5 使用 authjs.session-token）
    const cookieName = process.env.NODE_ENV === 'production' 
      ? '__Secure-authjs.session-token' 
      : 'authjs.session-token';
    
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Test login failed:', error);
    return ApiError.internal();
  }
}
