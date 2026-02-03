import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';
import { verifyAdminAuth, isUserDeveloper } from '@/lib/admin-auth';

/**
 * POST /api/admin/user/toggle-admin
 * 设置/取消管理者权限（仅开发者可操作）
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  
  // 只有开发者可以设置管理者
  if (!authResult.authorized || !authResult.isDeveloper) {
    return ApiError.forbidden('只有开发者可以设置管理者');
  }

  try {
    const body = await request.json();
    const { userId, isAdmin } = body;

    if (!userId) {
      return ApiError.badRequest('缺少用户 ID');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ApiError.notFound('用户不存在');
    }

    // 不能修改开发者的管理者状态
    const targetIsDeveloper = await isUserDeveloper(userId);
    if (targetIsDeveloper) {
      return ApiError.badRequest('不能修改开发者的权限');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: !!isAdmin },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
      },
    });

    return success(updatedUser);
  } catch (error) {
    console.error('Failed to toggle admin:', error);
    return ApiError.internal();
  }
}
