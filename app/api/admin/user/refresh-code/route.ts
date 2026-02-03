import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';
import { verifyDeveloper, generateTestLoginCode } from '@/lib/admin-auth';

/**
 * POST /api/admin/user/refresh-code
 * 刷新测试账号的登录码
 */
export async function POST(request: NextRequest) {
  if (!(await verifyDeveloper(request))) {
    return ApiError.forbidden('无权限访问');
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return ApiError.badRequest('缺少用户 ID');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ApiError.notFound('用户不存在');
    }

    if (!user.isTestAccount) {
      return ApiError.badRequest('只能刷新测试账号的登录码');
    }

    // 生成新的测试登录码
    let testLoginCode = generateTestLoginCode();
    let attempts = 0;
    while (attempts < 10) {
      const existingCode = await prisma.user.findUnique({
        where: { testLoginCode },
      });
      if (!existingCode) break;
      testLoginCode = generateTestLoginCode();
      attempts++;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { testLoginCode },
      select: {
        id: true,
        name: true,
        email: true,
        testLoginCode: true,
      },
    });

    return success(updatedUser);
  } catch (error) {
    console.error('Failed to refresh login code:', error);
    return ApiError.internal();
  }
}
