import { prisma } from '@/lib/prisma';
import { success, ApiError } from '@/lib/api-response';

/**
 * GET /api/follow/followers?userId=xxx&page=1&limit=20
 * 获取用户的粉丝列表
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

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

    // 获取粉丝列表和总数
    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        select: {
          createdAt: true,
          follower: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              headline: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.follow.count({
        where: { followingId: userId },
      }),
    ]);

    return success({
      list: followers.map((f) => ({
        ...f.follower,
        followedAt: f.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to get followers:', error);
    return ApiError.internal();
  }
}
