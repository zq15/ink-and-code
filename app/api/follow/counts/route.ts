import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';

/**
 * GET /api/follow/counts?userId=xxx
 * 获取用户的关注数和粉丝数
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return ApiError.badRequest('缺少 userId 参数');
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return ApiError.notFound('用户不存在');
    }

    // 并行查询关注数和粉丝数
    const [followingCount, followersCount] = await Promise.all([
      prisma.follow.count({
        where: { followerId: userId },
      }),
      prisma.follow.count({
        where: { followingId: userId },
      }),
    ]);

    return success({
      following: followingCount,
      followers: followersCount,
    });
  } catch (error) {
    console.error('Failed to get follow counts:', error);
    return ApiError.internal();
  }
}
