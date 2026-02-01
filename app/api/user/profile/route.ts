import { prisma } from '@/lib/prisma';
import { success, ApiError, requireAuth } from '@/lib/api-response';

/**
 * GET /api/user/profile
 * 获取当前用户信息
 */
export async function GET() {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const user = await prisma.user.findUnique({
      where: { id: userId! },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        username: true,
        bio: true,
        headline: true,
        createdAt: true,
      },
    });

    if (!user) {
      return ApiError.notFound('用户不存在');
    }

    return success(user);
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return ApiError.internal();
  }
}

/**
 * POST /api/user/profile
 * 更新当前用户信息
 */
export async function POST(request: Request) {
  try {
    const { userId, error: authError } = await requireAuth();
    if (authError) return authError;

    const data = await request.json();

    // 如果要更新 username，检查是否已被使用
    if (data.username) {
      // 验证 username 格式（只允许字母、数字、下划线、短横线）
      const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
      if (!usernameRegex.test(data.username)) {
        return ApiError.badRequest('用户名只能包含字母、数字、下划线和短横线，长度 3-30');
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id: userId! },
        },
      });

      if (existingUser) {
        return ApiError.conflict('该用户名已被使用');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId! },
      data: {
        ...(data.username !== undefined && { username: data.username }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.headline !== undefined && { headline: data.headline }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        username: true,
        bio: true,
        headline: true,
      },
    });

    return success(updatedUser, '个人资料更新成功');
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return ApiError.internal();
  }
}
