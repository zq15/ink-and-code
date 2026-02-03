import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';
import { verifyDeveloper, generateTestLoginCode } from '@/lib/admin-auth';

/**
 * POST /api/admin/user/create-test
 * 创建测试账号
 */
export async function POST(request: NextRequest) {
  if (!(await verifyDeveloper(request))) {
    return ApiError.forbidden('无权限访问');
  }

  try {
    const body = await request.json();
    const { name, email } = body;

    if (!email) {
      return ApiError.badRequest('缺少邮箱');
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return ApiError.badRequest('该邮箱已被使用');
    }

    // 生成唯一的测试登录码
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

    // 创建测试账号
    const user = await prisma.user.create({
      data: {
        name: name || `测试用户 ${testLoginCode}`,
        email,
        isTestAccount: true,
        testLoginCode,
        emailVerified: new Date(), // 测试账号自动验证
      },
      select: {
        id: true,
        name: true,
        email: true,
        isTestAccount: true,
        testLoginCode: true,
        createdAt: true,
      },
    });

    return success({
      ...user,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to create test account:', error);
    return ApiError.internal();
  }
}
