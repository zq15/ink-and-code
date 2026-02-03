import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';
import crypto from 'crypto';

/**
 * GET /api/admin/verify
 * 验证当前用户是否是开发者或管理者
 */
export async function GET(request: NextRequest) {
  const developerToken = process.env.DEVELOPER_TOKEN;
  
  if (!developerToken) {
    return ApiError.internal('DEVELOPER_TOKEN 未配置');
  }

  // 方式1: 通过 URL token 参数验证（开发者）
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get('token');
  if (queryToken === developerToken) {
    return success({ isDeveloper: true, isAdmin: false, authorized: true, method: 'token' });
  }

  // 方式2: 通过 Authorization header 验证（开发者）
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token === developerToken) {
      return success({ isDeveloper: true, isAdmin: false, authorized: true, method: 'header' });
    }
  }

  // 方式3: 通过登录用户验证
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
      return success({ isDeveloper: true, isAdmin: false, authorized: true, method: 'session' });
    }
    
    // 检查是否是管理者
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });
    
    if (user?.isAdmin) {
      return success({ isDeveloper: false, isAdmin: true, authorized: true, method: 'session' });
    }
  }

  return success({ isDeveloper: false, isAdmin: false, authorized: false });
}
