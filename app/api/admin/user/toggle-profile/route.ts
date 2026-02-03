import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';
import { verifyAdminAuth, isUserDeveloper } from '@/lib/admin-auth';

/**
 * POST /api/admin/user/toggle-profile
 * 切换用户个人资料可见性
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return ApiError.forbidden('无权限访问');
  }

  try {
    const body = await request.json();
    const { userId, hidden } = body;

    if (!userId) {
      return ApiError.badRequest('缺少用户 ID');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return ApiError.notFound('用户不存在');
    }

    // 检查目标用户是否是开发者账号
    const targetIsDeveloper = await isUserDeveloper(userId);
    
    // 管理者不能操作开发者
    if (authResult.isAdmin && !authResult.isDeveloper && targetIsDeveloper) {
      return ApiError.badRequest('管理者不能操作开发者');
    }
    
    // 管理者不能操作其他管理者（只有开发者可以）
    if (authResult.isAdmin && !authResult.isDeveloper && user.isAdmin) {
      return ApiError.badRequest('管理者不能操作其他管理者');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profileHidden: hidden,
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileHidden: true,
      },
    });

    return success(updatedUser);
  } catch (error) {
    console.error('Failed to toggle profile visibility:', error);
    return ApiError.internal();
  }
}
