import { prisma } from '@/lib/prisma';
import { success, ApiError, getCurrentUserId } from '@/lib/api-response';

/**
 * GET /api/follow/status?userId=xxx
 * 检查当前用户是否已关注目标用户
 */
export async function GET(request: Request) {
  try {
    const currentUserId = await getCurrentUserId();
    
    // 未登录用户返回未关注状态
    if (!currentUserId) {
      return success({ following: false, isLoggedIn: false });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return ApiError.badRequest('缺少 userId 参数');
    }

    // 检查是否已关注
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    });

    return success({
      following: !!follow,
      isLoggedIn: true,
      isSelf: currentUserId === targetUserId,
    });
  } catch (error) {
    console.error('Failed to check follow status:', error);
    return ApiError.internal();
  }
}
