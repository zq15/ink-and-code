import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';
import { verifyAdminAuth, isUserDeveloper } from '@/lib/admin-auth';

/**
 * POST /api/admin/user/ban
 * 禁用/解禁用户
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return ApiError.forbidden('无权限访问');
  }

  try {
    const body = await request.json();
    const { userId, banned, reason } = body;

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
    
    // 开发者账号不能被任何人禁用
    if (targetIsDeveloper) {
      return ApiError.badRequest('开发者账号不能被禁用');
    }
    
    // 管理者不能操作其他管理者（只有开发者可以）
    if (authResult.isAdmin && !authResult.isDeveloper && user.isAdmin) {
      return ApiError.badRequest('管理者不能操作其他管理者');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        bannedAt: banned ? new Date() : null,
        banReason: banned ? (reason || '违反社区规定') : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        bannedAt: true,
        banReason: true,
      },
    });

    return success({
      ...updatedUser,
      bannedAt: updatedUser.bannedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Failed to ban/unban user:', error);
    return ApiError.internal();
  }
}
