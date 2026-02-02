import { prisma } from '@/lib/prisma';
import { success, ApiError, requireAuth, validateRequired } from '@/lib/api-response';

/**
 * POST /api/follow/toggle
 * 关注/取消关注用户
 * Body: { userId: string } - 目标用户 ID
 */
export async function POST(request: Request) {
  try {
    const { userId: currentUserId, error: authError } = await requireAuth();
    if (authError) return authError;

    const data = await request.json();
    const validationError = validateRequired(data, ['userId']);
    if (validationError) return validationError;

    const targetUserId = data.userId;

    // 不能关注自己
    if (currentUserId === targetUserId) {
      return ApiError.badRequest('不能关注自己');
    }

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return ApiError.notFound('用户不存在');
    }

    // 检查是否已关注
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId!,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      // 取消关注
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      return success({ following: false }, '已取消关注');
    } else {
      // 关注
      await prisma.follow.create({
        data: {
          followerId: currentUserId!,
          followingId: targetUserId,
        },
      });
      return success({ following: true }, '关注成功');
    }
  } catch (error) {
    console.error('Failed to toggle follow:', error);
    return ApiError.internal();
  }
}
